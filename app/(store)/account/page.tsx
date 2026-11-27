"use client";

import { FormEvent, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

type Profile = { name: string | null; email: string; phone: string | null };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    void api<Profile>("/api/account")
      .then((data) => {
        setProfile(data);
        setLoadError("");
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Could not load profile.");
      });
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      setProfile(await api<Profile>("/api/account", { method: "PATCH", body: JSON.stringify({ name: data.get("name"), phone: data.get("phone") }) }));
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile.");
    }
  }
  if (loadError) {
    return (
      <div className="grid max-w-lg gap-3">
        <h1 className="text-3xl font-medium">Profile</h1>
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => window.location.assign("/login?callbackUrl=/account")}>
          Sign in again
        </Button>
      </div>
    );
  }
  if (!profile) return <div className="h-40 animate-pulse rounded-3xl bg-muted" />;
  return (
    <div className="grid max-w-lg gap-4">
      <h1 className="text-3xl font-medium">Profile</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" defaultValue={profile.name ?? ""} required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" value={profile.email} readOnly />
        </Field>
        <Field label="Mobile" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
        </Field>
        <Button type="submit">Save</Button>
      </form>
      <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </Button>
    </div>
  );
}
