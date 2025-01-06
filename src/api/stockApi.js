import { faBalanceScale } from "@fortawesome/free-solid-svg-icons";
import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or, and } from "firebase/firestore";
import { db } from './firebase';
const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

const STATUS = {
    PENDIENT: "PENDIENT",
    FAILED: "FAILED",
    ADJUST: "ADJUST",
    DONE: "DONE",
    SYNC: "SYNC"
}

export async function getAllStockOfSomePart(refInventory) {
    //Aqui se debe calcular la sumatoria por cada CSR presente y la total de todas
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        const stockCollectionRef = collection(refInventory, "stock");
        const stockSnapshot = await getDocs(stockCollectionRef);
        if (stockSnapshot.empty) {
            return {
                total: {},
                detail: []
            };
        }
        let balance = [];
        let commonCount = {};
        stockSnapshot.docs.forEach((doc) => {
            if(!commonCount[doc.data().csr ? doc.data().csr : "any"]) commonCount[doc.data().csr ? doc.data().csr : "any"] = 0;
            commonCount[doc.data().csr ? doc.data().csr : "any"] += Number(doc.data().quantity);
            balance.push({
                csr: doc.data().csr ? doc.data().csr : "any",
                stock: Number(doc.data().quantity),
                lastUpdate: doc.data().lastUpdate,
                total: commonCount[doc.data().csr]
            });
        });
        return {
            total: commonCount,
            detail: balance
        };
    } catch(error) {
        throw new Error("No se pudo obtener el stock, " + error.message);
    }
}

export async function setStockToSomePart(refStock, newStock, batch) {
    if(!batch) {
        batch = writeBatch(db);
    }
    try {
        if(!refStock) {
            throw new Error("No hay referencia para actualizar");
        }
        batch.set(refStock, {
            name: options.find(option => option.csr.toLowerCase() == (newStock.csr && newStock.csr.toLowerCase())).name || "any",
            csr: newStock.csr ? newStock.csr.toLowerCase() : "any",
            quantity: newStock.quantity || 0,
            lastUpdate: Timestamp.now()

        });
    } catch(error) {
        throw new Error("No se pudo agregar el stock: " + error.message);
    }
    return batch;
}

export async function verifyStockOfSomeTechnicianInPart(batch, tecRef, csr, diffOnHand, period) {
    //aqui buscamos desde el inicio del periodo hacia atras hasta fichar como corrupto todo los pendientes
    //luego acumular todo el stock del periodo y eh ir verificando desde el ultimo registro si se puede validar siendo exacto el acumulado y el diferencia
    //si falla desestima el ultimo stock y trata de que coincida con el anterior
    //si falla en todos los casos busca el instante que estuvo mas cerca y catalogo los consiguientes como corruptos
    //tambien estoy pensando si deberia simplificar las operaciones para reducir costes de almacenamiento4
    if(!batch) {
        batch = writeBatch(db);
        
    }
    try {
        //Se deben borrar todas las operaciones manuales pendientes o nulos dejando solo los sync . Al finalizar el wipe se ajusta el quantity considerando inmutables los adjust
        
        if(!(Timestamp.fromDate(new Date(period[0])).isEqual(Timestamp.fromDate(new Date(period[1]))))) {
            const q = query(collection(tecRef.parent.parent, "stock"), where("csr", "==", csr.toLowerCase()));
            const querySnapshot = await getDocs(q);
            let surplus = 0;
            // Filtrar los resultados en el cliente
            const lastPeriodCollection = querySnapshot.docs.filter((doc) => {
            const fecha = doc.data().lastUpdate; // Convertir Timestamp a Date
            return fecha >= Timestamp.fromDate(new Date(period[0])) && fecha <= Timestamp.fromDate(new Date(period[1]));
            });
            const restCollection = querySnapshot.docs.filter((doc) => {
                const fecha = doc.data().lastUpdate; // Convertir Timestamp a Date
                return fecha <= Timestamp.fromDate(new Date(period[0]));
            });
            //HAY QUE REFACTORIZAR LA FUNCION DE CONTEO DE OPERACION PARA EL STOCK DEBIDO A LOS NUEVOS ESTADOS QUE CONDICIONAN
            //Hay que Cuantificar y cambiar estados de cada uno de los tipos de operacion. Ya que en esta instancia se crea una operacion de ajuste en base a los balances
            let balance = {
                adjust: 0,
                failed: 0,
                sync: 0,
                done: 0,
                pendient: 0
            }
            lastPeriodCollection.forEach((doc) => {
                let quantity = doc.data().quantity;
                switch (doc.data().status) {
                    case STATUS.ADJUST:
                        //INMUTABLE
                        balance.adjust += quantity;
                    break;
                    case STATUS.FAILED:
                        //SE BORRA LUEGO DE UN PERIODO
                        balance.failed += quantity;
                        batch.delete(doc.ref);
                    break;
                    case STATUS.SYNC:
                        //INMUTABLE
                        balance.sync += quantity;
                    break;
                    case STATUS.DONE:
                        //SE BORRAN LUEGO DE UN PERIODO SIENDO EL TRANSCURRIDO NO COMMPUTADO
                        balance.done += quantity;
                        batch.delete(doc.ref);
                    break;
                    case STATUS.PENDIENT:
                        //SE COMPUTA Y NEUTRALIZA EL ESTADO PARA DEJAR REGISTRO
                        balance.pendient += quantity;
                        batch.update(doc.ref, {
                            status: STATUS.DONE
                        });
                    break;
                    default:
                        //SE ASUME QUE ES UN PENDIENTE
                        balance.pendient += quantity;
                        batch.update(doc.ref, {
                            status: STATUS.DONE
                        });
                    break;
                }
            });

            restCollection.forEach((doc) => {
                let quantity = doc.data().quantity;
                switch (doc.data().status) {
                    case STATUS.ADJUST:
                        //INMUTABLE
                        balance.adjust += quantity;
                    break;
                    case STATUS.FAILED:
                        //SE BORRA LUEGO DE UN PERIODO
                        batch.delete(doc.ref);
                    break;
                    case STATUS.SYNC:
                        //INMUTABLE
                        balance.sync += quantity;
                    break;
                    case STATUS.DONE:
                        //SE BORRAN LUEGO DE UN PERIODO SIENDO EL TRANSCURRIDO NO COMMPUTADO
                        batch.delete(doc.ref);
                    break;
                    case STATUS.PENDIENT:
                        //SE COMPUTA Y NEUTRALIZA EL ESTADO PARA DEJAR REGISTRO
                        batch.delete(doc.ref);
                    break;
                    default:
                        //SE ASUME QUE ES UN PENDIENTE
                        batch.delete(doc.ref);
                    break;
                }
            });
            console.log(balance)
            //El resto se recorre para hacer una wipe
            //Necesito saber si las pendientes
            if(diffOnHand != 0) {
                batch.set(doc(collection(tecRef.parent.parent, "stock")), {
                    status: STATUS.SYNC,
                    quantity: diffOnHand,
                    name: options.find(option => option.csr.toLowerCase() == (csr && csr.toLowerCase())).name || "any",
                    csr: csr ? csr.toLowerCase() : "any",
                    lastUpdate: Timestamp.now()
                });
            }
            if(balance.pendient != diffOnHand) {
                if(diffOnHand >= 0) {
                    surplus = balance.pendient - diffOnHand; //No puede quedar excedentes positivos
                    if(surplus < 0) {
                        surplus = 0;
                    }
                }
                else {
                    surplus = balance.pendient - diffOnHand;  //no pueden quedar excedentes negativos
                    if(surplus >= 0) {
                        surplus = 0;
                    }
                }
            }
            if(surplus != 0) {
                batch.set(doc(collection(tecRef.parent.parent, "stock")), {
                    status: STATUS.FAILED,
                    quantity: surplus,
                    name: options.find(option => option.csr.toLowerCase() == (csr && csr.toLowerCase())).name || "any",
                    csr: csr ? csr.toLowerCase() : "any",
                    lastUpdate: Timestamp.now()
                });
            }

            console.log("stock: " + balance.sync + balance.adjust + diffOnHand);
            console.log("conflico con: " + surplus);
            console.log(querySnapshot);
            console.log(batch);
            console.log(tecRef);
            console.log(csr);
            console.log(diffOnHand);
            console.log(period);
        }
            
    } catch(e) {
        console.error(e)
    }
    
    //tengo que formatear el createDate para poder buscar con where en stock usando lastUpdaate
    //El algoritmo va a borrar todas las operaciones de la ventana para simplificar y asi ahorrar memoria y gasto de recursos
    return batch;
}