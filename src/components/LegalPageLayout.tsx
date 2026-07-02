import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export const LegalPageLayout = ({ title, lastUpdated = 'June 27, 2026', children }: LegalPageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-card border rounded-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: {lastUpdated}</p>
          <div className="prose prose-sm max-w-none text-foreground space-y-8">
            {children}
          </div>
          <div className="mt-12 pt-8 border-t text-sm text-muted-foreground">
            <p>Operated by <strong>Nextchapter AI For Online Selling</strong>, a Commercial Sole Proprietorship Establishment registered in Dubai, UAE (Trade License No. 1610274). Registered address: Future Tower, Business Bay, Dubai, United Arab Emirates.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
