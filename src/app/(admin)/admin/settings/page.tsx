import { serviceClient } from "@/lib/supabase/service";
import { updatePlatformSetting } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SettingsForm } from "@/app/(admin)/admin/settings/settings-form";

interface PlatformSetting {
    key: string;
    value: any;
    description: string;
}

export default async function GlobalSettingsPage() {
    if (!serviceClient) return <div>Error: Service unavailable</div>;

    const { data: settingsResult } = await serviceClient
        .from("platform_settings")
        .select("*")
        .order("key");
    
    const settings = (settingsResult || []) as unknown as PlatformSetting[];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Configuración Global</h2>
            <p className="text-muted-foreground">Administra las variables de entorno y configuración del sistema.</p>

            <div className="grid gap-4">
                {settings?.map((setting) => (
                    <Card key={setting.key}>
                        <CardHeader className="py-4">
                            <CardTitle className="text-base font-medium font-mono">{setting.key}</CardTitle>
                            <CardDescription>{setting.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="py-4 border-t bg-muted/20">
                            <SettingsForm setting={setting} />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
