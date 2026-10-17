import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal = ({ isOpen, onClose }: ContactModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      toast({
        title: "Success!",
        description: "Your message has been sent successfully.",
        className: "bg-green-500 text-white",
      });

      onClose();
      setFormData({ name: "", email: "", subject: "", message: "" });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5" />
            Contact Ketan Kunkalikar
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your full name"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-300">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="subject" className="text-gray-300">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="What would you like to discuss?"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="message" className="text-gray-300">Message *</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Please share your questions, collaboration ideas, or any other inquiries..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transform hover:scale-105 transition-all duration-200"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-600">
          <p className="text-sm text-gray-400">
            You can also reach out directly at{" "}
            <a 
              href="mailto:ketankunkalikar33@gmail.com" 
              className="text-blue-400 hover:underline"
            >
              ketankunkalikar33@gmail.com
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
