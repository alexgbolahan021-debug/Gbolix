import { useEffect } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Building2, Phone, Globe, MapPin, Calendar, Shield } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const roleBadgeStyle: Record<string, string> = {
  owner: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  admin: "bg-secondary/10 text-secondary border-secondary/20",
  freelancer: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  client: "bg-primary/10 text-primary border-primary/20",
};

export default function Profile() {
  const { data: profile, isLoading } = useGetMe();
  const updateMutation = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", companyName: "", phone: "", website: "", country: "", city: "", timezone: "", language: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name ?? "",
        companyName: profile.companyName ?? "",
        phone: profile.phone ?? "",
        website: profile.website ?? "",
        country: profile.country ?? "",
        city: profile.city ?? "",
        timezone: profile.timezone ?? "",
        language: profile.language ?? "",
      });
    }
  }, [profile, form]);

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Profile updated", description: "Your changes have been saved." });
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Loading profile...</div>
        </div>
      </ClientLayout>
    );
  }

  const initials = profile?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-2">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }} data-testid="text-profile-heading">Profile Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and personal information.</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center border-2 border-primary/20 text-xl font-bold shrink-0" data-testid="img-avatar">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span className="text-primary">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold truncate" style={{ fontFamily: "Space Grotesk, sans-serif" }} data-testid="text-profile-name">{profile?.name}</p>
              <p className="text-sm text-muted-foreground truncate" data-testid="text-profile-email">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`text-xs border capitalize ${roleBadgeStyle[profile?.role ?? "client"] ?? ""}`}>
                  <Shield size={10} className="mr-1" />
                  {profile?.role}
                </Badge>
                {profile?.companyName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 size={10} /> {profile.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick info row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
            {[
              { icon: Mail, value: profile?.email, label: "Email" },
              { icon: MapPin, value: [profile?.city, profile?.country].filter(Boolean).join(", ") || "—", label: "Location" },
              { icon: Building2, value: profile?.userType ?? "—", label: "Business Type" },
              { icon: Calendar, value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—", label: "Member Since" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</span>
                  <span className="text-xs font-medium flex items-center gap-1 truncate">
                    <Icon size={10} className="text-muted-foreground shrink-0" />
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <User size={16} className="text-primary" /> Personal Information
          </h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Your full name" data-testid="input-full-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Your company" data-testid="input-company-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input {...field} placeholder="+1 (555) 000-0000" data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} placeholder="https://yoursite.com" className="pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} placeholder="Your city" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input {...field} placeholder="Your country" data-testid="input-country" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="timezone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. America/New_York" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="language" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. English" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-save-profile"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Account Details */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield size={16} className="text-primary" /> Account Details
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2"><Mail size={12} /> Email</span>
              <span data-testid="text-account-email">{profile?.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Business Type</span>
              <span data-testid="text-account-user-type">{profile?.userType ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Company Size</span>
              <span>{profile?.companySize ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Acquisition Source</span>
              <span>{profile?.acquisitionSource ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Member Since</span>
              <span data-testid="text-account-member-since">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
