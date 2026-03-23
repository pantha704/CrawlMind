"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        
        // Auto-populate from OAuth session if DB is empty
        if (!data.image && session?.user?.image) {
          setImage(session.user.image);
          // We could auto-save here, but let's let the user hit Save
        } else {
          setImage(data.image || "");
        }
      } catch {
        toast.error("Could not load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      
      const { user } = await res.json();
      setProfile(user);
      toast.success("Profile updated successfully!");
      
      // Reload page to update the session context in topbar
      window.location.reload();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
              <p className="text-muted-foreground mt-2">
                Manage your personal information and preferences.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : profile ? (
              <div className="grid gap-6">
                <Card className="bg-secondary/20 border-border/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your photo and personal details here.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <Avatar className="w-24 h-24 ring-4 ring-background shadow-xl">
                          <AvatarImage src={image || ""} alt={name || "User"} />
                          <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                            {name?.charAt(0)?.toUpperCase() || profile.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-3 flex-1 w-full">
                          <Label>Profile Image</Label>
                          <div className="flex gap-4 items-center">
                            <div className="relative">
                              <Input
                                type="file"
                                id="image-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                              />
                              <Label
                                htmlFor="image-upload"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 bg-primary/10 text-primary border-primary/20"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Photo
                              </Label>
                            </div>
                            <span className="text-xs text-muted-foreground">or URL below</span>
                          </div>
                          <div className="relative">
                            <Input
                              id="image"
                              value={image.startsWith('data:image') ? '' : image}
                              onChange={(e) => setImage(e.target.value)}
                              placeholder={image.startsWith('data:image') ? 'Custom image uploaded' : "https://example.com/avatar.jpg"}
                              className="bg-background/50"
                              disabled={image.startsWith('data:image')}
                            />
                            {image.startsWith('data:image') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setImage("")}
                                className="text-xs text-red-500 hover:text-red-400 absolute right-1 top-1 h-7 px-2"
                              >
                                Remove Upload
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="bg-background/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-background/30 text-muted-foreground cursor-not-allowed"
                          />
                          <p className="text-xs text-muted-foreground">Linked to your Google account</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                        <Button type="submit" disabled={saving || (!name && !image)} className="glow-cyan w-full sm:w-auto">
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/20 border-border/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-border/50">
                      <span className="text-muted-foreground">Current Plan</span>
                      <span className="font-medium px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                        {profile.plan}
                      </span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-medium">
                        {new Date(profile.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
    </div>
  );
}
