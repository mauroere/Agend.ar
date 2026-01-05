"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type User = {
  id: string;
  email: string;
  role: "owner" | "staff";
  last_sign_in_at?: string;
};

export function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "staff">("staff");
  const [inviting, setInviting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        loadUsers();
      } else {
        const body = await res.json();
        alert(body.error || "Error al invitar");
      }
    } catch (e) {
      alert("Error de red");
    } finally {
      setInviting(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Usuarios</h2>
      
      <div className="space-y-4 mb-8">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{u.email}</p>
                  <p className="text-xs text-slate-500">
                    {u.role} · Último acceso: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Nunca"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleInvite} className="flex gap-2 items-end">
        <div className="grid gap-1 flex-1">
          <label className="text-sm font-medium">Email</label>
          <Input 
            type="email" 
            value={inviteEmail} 
            onChange={(e) => setInviteEmail(e.target.value)} 
            placeholder="colega@ejemplo.com"
            required
          />
        </div>
        <div className="grid gap-1 w-32">
          <label className="text-sm font-medium">Rol</label>
          <Select 
            value={inviteRole} 
            onChange={(e) => setInviteRole(e.target.value as "owner" | "staff")}
          >
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </Select>
        </div>
        <Button type="submit" disabled={inviting}>
          {inviting ? "Invitando..." : "Invitar"}
        </Button>
      </form>
    </Card>
  );
}
