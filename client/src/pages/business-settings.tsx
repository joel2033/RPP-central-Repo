import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, MapPin, Clock, Palette, Globe } from "lucide-react";

export default function BusinessSettings() {
  return (
    <Layout title="Business Details">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Business Details</h1>
          <p className="text-muted-foreground">
            Manage your business branding, hours, service areas, and domain settings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Coming soon: Company name, logo, and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Configure Business Info
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding & Theme
              </CardTitle>
              <CardDescription>
                Coming soon: Custom colors, logos, and branding options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Customize Branding
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Coming soon: Set operating hours and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Set Business Hours
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Service Areas
              </CardTitle>
              <CardDescription>
                Coming soon: Define geographical service coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Configure Service Areas
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domain
              </CardTitle>
              <CardDescription>
                Coming soon: Set up custom domain for delivery pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                Setup Custom Domain
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}