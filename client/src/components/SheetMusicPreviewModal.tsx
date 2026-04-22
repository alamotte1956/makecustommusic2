import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer, X } from "lucide-react";
import { toast } from "sonner";

interface SheetMusicPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  previewContent: {
    type: "pdf" | "lead-sheet" | "nashville" | "print";
    html?: string;
    title: string;
  };
  onDownload?: () => void;
  onPrint?: () => void;
}

export function SheetMusicPreviewModal({
  isOpen,
  onClose,
  songTitle,
  previewContent,
  onDownload,
  onPrint,
}: SheetMusicPreviewModalProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");

  useEffect(() => {
    if (previewContent.html) {
      setPreviewHtml(previewContent.html);
    }
  }, [previewContent.html]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      toast.success(`${previewContent.title} downloaded!`);
      onClose();
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Preview: {previewContent.title}</span>
            <span className="text-sm font-normal text-muted-foreground">{songTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-white rounded-lg border border-border">
          {previewContent.html ? (
            <iframe
              srcDoc={previewContent.html}
              className="w-full h-full border-none"
              title={`${previewContent.title} Preview`}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Loading preview...</p>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <DialogFooter className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          {onPrint && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )}
          {onDownload && (
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
