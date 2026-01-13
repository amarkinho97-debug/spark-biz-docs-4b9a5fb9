import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";

interface ExpertCardProps {
  name: string;
  role: string;
  imageUrl?: string;
  specialties?: string[];
  linkedinUrl?: string;
}

export function ExpertCard({ name, role, imageUrl, specialties = [], linkedinUrl }: ExpertCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-center w-full px-6 py-8 bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 hover-scale hover:border-primary/50 hover:bg-card/95 transition-all duration-300 animate-fade-in"
    >
      <div className="flex flex-col items-center justify-center w-full mt-8 gap-4">
        <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-primary to-accent p-[4px] mx-auto animate-scale-in group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/40 to-accent/40 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover rounded-full bg-background block"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-4xl font-bold text-primary">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="text-center">
          <h4 className="font-bold text-lg text-foreground">{name}</h4>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>

      {specialties.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {specialties.map((spec) => (
            <span
              key={spec}
              className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 text-primary text-[11px] font-medium"
            >
              {spec}
            </span>
          ))}
        </div>
      )}

      {linkedinUrl && (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center justify-center rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <Linkedin className="w-3 h-3 mr-1" />
          LinkedIn
        </a>
      )}
    </motion.div>
  );
}
