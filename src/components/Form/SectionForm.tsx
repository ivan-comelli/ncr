// ClientSection.jsx

import Grid from "@mui/material/Grid2";
import { FormControlLabel, Slider, FormLabel, TextField, Typography, Autocomplete, Chip, ToggleButton, ToggleButtonGroup, InputLabel, Select, FormControl, Box, FormHelperText, MenuItem, OutlinedInput, Checkbox } from "@mui/material";
import { Control, UseFormRegister, FieldError, Controller, } from "react-hook-form";

type OptionType = {
    id: number,
    label: string
}

type RenderType = 'Ranking' | 'TextField' | 'AutoComplete' | 'AutoCompleteMultiOption' | 'Selector' | 'ToggleButton' | 'CheckBox';

type InputType = {
    name: keyof FormValues,
    label: string,
    level: 1 | 2 | 3,
    error: FieldError | null,
    render: {
        type: RenderType,
        options: OptionType[] | null
    }
}

type FormValues = {
    terminalId: string,
    client: OptionType,
    location: OptionType,
    numberBranch: number,
    serialNumber: number,
    terminalModel: OptionType,
    settingRed: 'Red Propia' | 'Banelco' | 'Link',
    settingType: 'ATM' | 'TASI',
    siteInfraestructure: 'Neutral' | 'Sucursal',
    cpuModel: OptionType,
    deviceSetting: OptionType[],
    pressurePump: boolean,
    presenterBelt: boolean,
    ldvtDrive: boolean,
    ldvtStatus: boolean,
    motorClamp: boolean,
    capacitorStatus: boolean,
    verticalBelt: boolean,
    sensorLow: boolean,
    interfacePCB: boolean,
    solenoidStatus: boolean,
    gearDriveStatus: boolean,
    pickLineStatus: boolean,
    resultStatusS1: number
}

type SectionProps = {
    register: UseFormRegister<FormValues>,
    control: Control<FormValues>,
    section: {
        name: string,
        label: string,
    },
    inputs: InputType[]
};

export default function SectionForm({ register, control, section, inputs }: SectionProps) {
    const maxBase = 4;
    const renderInput = (type: RenderType, itemInput: InputType) => {
        switch (type) {
            case 'TextField':
                return (<TextField
                    label={itemInput.label}
                    size="small"
                    fullWidth
                    {...register(itemInput.name, { required: "Es obligatorio" })}
                    error={!!itemInput.error}
                    helperText={itemInput.error?.message}
                />);
            case "AutoComplete":
                return (
                    <Controller
                        name={itemInput.name as any}
                        control={control}
                        rules={{ required: "Campo requerido" }}
                        render={({ field, fieldState }) => (
                            <Autocomplete<OptionType | string, false, false, true>
                                {...field}
                                options={itemInput.render.options ?? []}
                                freeSolo
                                getOptionLabel={(option) =>
                                    typeof option === "string" ? option : option.label ?? ""
                                }
                                onChange={(_, value) => {
                                    if (!value) {
                                        field.onChange(null);
                                        return;
                                    }
                                    const valueLabel = typeof value === "string" ? value : value.label;
                                    const matches = (itemInput.render.options ?? []).filter((c) =>
                                        String(c.label).toLowerCase().includes(String(valueLabel).toLowerCase())
                                    );
                                    if (matches.length === 1) {
                                        field.onChange(matches[0]);
                                    } else {
                                        field.onChange(null);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={itemInput.label}
                                        size="small"
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                    />
                                )}
                            />
                        )}
                    />
                );
            case 'AutoCompleteMultiOption':
                return (
                    <Controller
                        name={itemInput.name}
                        control={control}
                        defaultValue={[]}
                        render={({ field, fieldState }) => {
                            const f = field as {
                                value: OptionType[];
                                onChange: (value: OptionType[]) => void;
                            };
                            return(
                                <Autocomplete<OptionType, true>
                                    multiple
                                    options={itemInput.render.options} // ← evita null
                                    value={f.value ?? []} // ← asegura array
                                    onChange={(_, data) => f.onChange(data)}
                                    getOptionLabel={(option) => option?.label ?? ""}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                key={option.id}
                                                label={option.label}
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={itemInput.label as string}
                                            placeholder="Seleccioná uno o varios"
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                            )
                        }}
                    />
                );
            
            case 'Selector':
                return(
                    <Controller
                        name={itemInput.name}
                        control={control}
                        defaultValue={[]}
                        render={({ field, fieldState }) => {
                            const f = field as {
                                value: OptionType[];
                                onChange: (value: OptionType[]) => void;
                            };
                            return (
                                <FormControl fullWidth error={!!fieldState.error}>
                                    <InputLabel>{itemInput.label}</InputLabel>
                                    <Select
                                        multiple
                                        value={f.value.map((v) => v.id)}   // solo IDs
                                        onChange={(e) => {
                                            const selectedIds = e.target.value as number[];
                                            const selectedObjects = itemInput.render.options.filter(
                                                (opt) => selectedIds.includes(opt.id)
                                            );
                                            f.onChange(selectedObjects);   // devolvés objetos al form
                                        }}
                                        input={<OutlinedInput label={itemInput.label} />}
                                        renderValue={(selected) => {
                                            const selectedObjects = itemInput.render.options.filter((opt) =>
                                                (selected as number[]).includes(opt.id)
                                            );
                                            return (
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                    {selectedObjects.map((option) => (
                                                        <Chip key={option.id} label={option.label} />
                                                    ))}
                                                </Box>
                                            );
                                        }}
                                    >
                                        {itemInput.render.options.map((opt) => (
                                            <MenuItem key={opt.id} value={opt.id}>
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {fieldState.error && (
                                        <FormHelperText>
                                            {fieldState.error.message}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                            );
                        }}
                    />
                )
            case 'ToggleButton':
                return (
                    <FormControl
                        size="small"
                        error={!!itemInput.error}
                        fullWidth
                    >
                        <FormLabel>{itemInput.label}</FormLabel>
                        <Controller
                            name={itemInput.name}
                            control={control}
                            defaultValue=""
                            rules={{ required: "Seleccioná una opcion" }}
                            render={({ field }) => (
                                <ToggleButtonGroup
                                exclusive
                                value={field.value}
                                onChange={(_, value) => {
                                    if (value !== null) field.onChange(value);
                                }}
                                >
                                    {itemInput.render.options.map(item => (
                                        <ToggleButton value={item.label}>{item.label}</ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            )}
                        />
                        {itemInput.error && (
                        <FormHelperText>{itemInput.error.message}</FormHelperText>
                        )}
                    </FormControl>
                );
            case 'CheckBox':
                return (
                    <FormControl
                        component="fieldset"
                        error={!!itemInput.error}
                        variant="standard"
                        >
                        <FormControlLabel
                            control={
                            <Controller
                                name={itemInput.name}
                                control={control}
                                defaultValue={false}
                                rules={{ required: "Obligatorio" }}
                                render={({ field }) => (
                                <Checkbox
                                    checked={field.value as boolean}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                                )}
                            />
                            }
                            label={itemInput.label}
                        />
                        {itemInput.error && (
                            <FormHelperText>{itemInput.error.message}</FormHelperText>
                        )}
                    </FormControl>
                )
            case 'Ranking':
                return(
                    <Controller
                        name={itemInput.name}
                        control={control}
                        rules={{ required: "Seleccioná un valor" }}
                        render={({ field, fieldState }) => (
                            <FormControl fullWidth>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {itemInput.label}
                            </Typography>
                            <Slider
                                value={field.value as number}
                                onChange={(_, value) => field.onChange(value as number)}
                                step={1}
                                min={0}
                                max={10}
                                marks
                                valueLabelDisplay="auto"
                            />
                            {fieldState.error && (
                                <Typography variant="caption" color="error">
                                {fieldState.error.message}
                                </Typography>
                            )}
                            </FormControl>
                        )}
                        />
                )
        }
    }
    return (
        <Grid className={`section-wrap ${section.name}`}
            container
            columnSpacing={2}
            size={12}
            padding={"1rem"}
        >
            <Grid className="subtitle-wrap"
                size={{ xs: 12, md: 2, lg: 4 }}
            >
                <Typography variant="subtitle1" marginBottom={"1rem"}>{section.label}</Typography>
            </Grid>
            <Grid className="content-wrapper"
                size="grow"
                container
                columnSpacing={2}
                rowSpacing={2}
            >
                {
                    inputs.map((item, i) => {
                        return (
                            <Grid size={(item.level / maxBase) * 12}>
                                {renderInput(item.render.type, item)}
                            </Grid>
                        )
                    })
                }
            </Grid>
        </Grid>
    );
}
