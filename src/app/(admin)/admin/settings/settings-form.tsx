'use client';

import { useState, useTransition } from "react";
import { updatePlatformSetting } from "./actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function SettingsForm({ setting }: { setting: any }) {
    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(setting.value);
    const { toast } = useToast();

    // Detect type
    const isBoolean = typeof value === 'boolean';
    const isNumber = typeof value === 'number';

    const handleSave = async (newValue: any) => {
        startTransition(async () => {
            try {
                await updatePlatformSetting(setting.key, newValue);
                setValue(newValue);
                toast({
                    title: "Configuración actualizada",
                    description: `Setting updated.`
                });
            } catch (error) {
                toast({
                    title: "Error", 
                    description: "No se pudo actualizar la configuración",
                    variant: "destructive"
                });
            }
        });
    };

    if (isBoolean) {
        return (
            <div className="flex items-center space-x-2">
                <Switch 
                    id={setting.key} 
                    checked={value} 
                    onCheckedChange={handleSave}
                    disabled={isPending}
                />
                <Label htmlFor={setting.key}>
                    {value ? "Habilitado" : "Deshabilitado"}
                    {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />}
                </Label>
            </div>
        );
    }

    return (
        <div className="flex gap-2 max-w-sm items-center">
             <Input 
                type={isNumber ? "number" : "text"}
                defaultValue={value}
                disabled={isPending}
                onChange={(e) => {
                    const val = isNumber ? Number(e.target.value) : e.target.value;
                    // Don't auto save text, wait for button or blur? 
                    // For simplicity, let's keep local state and add a save button for text
                }}
                name="value"
            />
            <Button 
                onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    const val = isNumber ? Number(input.value) : input.value;
                    handleSave(val);
                }}
                disabled={isPending}
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
        </div>
    );
}
