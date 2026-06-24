"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";

const levels = ["N5", "N4", "N3", "N2", "N1"];

export default function ProfileSetupPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [level, setLevel] = useState("N5");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
        setLevel(data.level ?? "N5");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, [router]);

  function friendly(message: string): string {
    if (message.includes("schema cache")) {
      return "データベースの準備がまだのようです。Supabase の SQL Editor で supabase/schema.sql を実行してから、もう一度お試しください。";
    }
    return message;
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setError(friendly(upErr.message));
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${pub.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    // upsert so it works even if the profile row doesn't exist yet
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: displayName,
        username,
        level,
        bio,
        avatar_url: avatarUrl ? avatarUrl.split("?")[0] : null,
      },
      { onConflict: "id" },
    );

    if (error) {
      setError(friendly(error.message));
      setSaving(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6 text-center text-muted">Loading…</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">Set up your profile</h1>
        <p className="mt-1 text-ink/70">Tell other learners a little about you. 🌸</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <span className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-mint">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <Icon.profile className="h-8 w-8 text-moss" />
              )}
            </span>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatar}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Icon.camera className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload photo"}
              </Button>
              <p className="mt-1.5 text-xs text-muted">PNG / JPG. Square looks best.</p>
            </div>
          </div>

          <Field label="Display name" value={displayName} onChange={setDisplayName} />
          <Field label="Username" value={username} onChange={setUsername} />

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Level</span>
            <div className="flex flex-wrap gap-2">
              {levels.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    level === l ? "bg-pine text-cream" : "bg-mint text-pine hover:bg-moss/20"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Learning Japanese, one diary at a time."
              className="w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-moss"
            />
          </label>

          {error && <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving…" : "Save and continue"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-moss"
      />
    </label>
  );
}
