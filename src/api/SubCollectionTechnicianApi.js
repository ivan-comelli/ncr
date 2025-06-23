import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from './firebase';
import { verifyStockOfSomeTechnicianInPart } from './SubCollectionStockApi';

const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

export async function getTechnicianOfSomePart(refInventory, identity) {
    let response = null;
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        console.groupCollapsed(`Get technician of inventory ${refInventory.id}:`);

        const technicianCollectionRef = collection(refInventory, "technicians");
        let technicianSnapshot = null;
        if(identity){
            const qTechnician = query(technicianCollectionRef, or(where("csr", "==", identity.csr), where("name", "==", identity.name)));
            technicianSnapshot = await getDocs(qTechnician);
        }
        else {
            technicianSnapshot = await getDocs(technicianCollectionRef);
        }
        if (technicianSnapshot.size > 1 && identity) {
            throw new Error("Hay mas de una coincidencia.");
        }
        response = technicianSnapshot.docs.map(doc => {
            console.log(`Tech ${doc.data().name} in ${doc.id}`);
            return {
                id: doc.id, // Incluye el ID del documento si es necesario
                ...doc.data() // Extrae los datos del documento
            }
        });
        console.groupEnd();
    } catch(error) {
        throw new Error("No se pudo obtener el tecnico, " + error.message);
    }
    return response;
}

export async function initTechnicianToSomePart(refInventory, batch) {
    try {
        //const technicianST = await getDocs(collection(refInventory, "technicians"));
        console.log(`Initialization technician of inventory ${refInventory.id}:`);
        options.forEach((item) => {
            //if(!technicianST.find(tec => (tec.csr.toLowerCase() == item.csr.toLowerCase()))) {
                let docTech = doc(collection(refInventory, "technicians"));
                console.log(`Init ${item.name} in ${docTech.id}`);
                batch.set(docTech, {
                    name: item.name,
                    csr: item.csr.toLowerCase(),
                    onHand: 0,
                    ppk: 0,
                    lastUpdate: Timestamp.now()
                });
            //}
        })
    }
    catch(e) {

    }
    return batch

}

export async function setTechnicianToSomePart(refTechnician, newTechnician, batch, lastLog = {onHand: 0, createdAt: undefined}) {
    //tengo que calcular la diferencia de OH en la ventana del ultimo periodo registrado
    //por cada technician de parte hay que ir a validar el stock
    //ACA FALLA porque si el tecnico no tiene ningun registro de onHand en una pieza tira error
    await verifyStockOfSomeTechnicianInPart(batch, refTechnician, newTechnician.csr, newTechnician.onHand);

    try {
        if(!refTechnician) {
            throw new Error("No hay referencia para actualizar");
        }
        console.log(`Setting tech ${newTechnician.csr.toLowerCase()} in reference ${refTechnician.id}`);

        batch.set(refTechnician, {
            ...newTechnician,
            csr: newTechnician.csr.toLowerCase(),
            onHand: newTechnician.onHand || 0,
            ppk: newTechnician.ppk || 0,
            lastUpdate: Timestamp.now()
        }, 
        { merge: true });
    } catch(error) {
        throw new Error("No se pudo agregar al tecnico: " + error.message);
    }
    return batch;
}