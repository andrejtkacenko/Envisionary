import { Zap } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
        <Zap className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-headline font-bold text-foreground">Zenith Flow</h1>
      <span className="sr-only">Zenith Flow</span>
    </Link>
  );
}
