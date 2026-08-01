import { cn } from "@/libs/style/style.util.helpers";
import Link from "next/link";

interface MenuItemsProps {
  className?: string;
  itemClassName?: string;
  onClose?: () => void;
}

export function MenuItems({ className, itemClassName, onClose }: MenuItemsProps) {
  return (
    <nav className={cn(className, 'text-sm')}>
      <Link onClick={onClose}
        href="/"
        className={itemClassName ?? "relative w-fit block after:block after:content-[''] after:absolute after:h-[3px] after:bg-primary  after:-translate-x-1/2 after:translate-y-1 after:left-1/2 after:w-5 after:scale-x-0 after:hover:scale-x-100 after:transition after:duration-300 after:origin-center"}
      >
        خانه
      </Link>
      <Link onClick={onClose}
        href="/#how-it-works"
        className={itemClassName ?? "relative w-fit block after:block after:content-[''] after:absolute after:h-[3px] after:bg-primary  after:-translate-x-1/2 after:translate-y-1 after:left-1/2 after:w-5 after:scale-x-0 after:hover:scale-x-100 after:transition after:duration-300 after:origin-center"}
      >
        چطور کار می‌کند
      </Link>
      <Link onClick={onClose}
        href="/#features"
        className={itemClassName ?? "relative w-fit block after:block after:content-[''] after:absolute after:h-[3px] after:bg-primary  after:-translate-x-1/2 after:translate-y-1 after:left-1/2 after:w-5 after:scale-x-0 after:hover:scale-x-100 after:transition after:duration-300 after:origin-center"}
      >
        ویژگی‌ها
      </Link>
      <Link onClick={onClose}
        href="/#faq"
        className={itemClassName ?? "relative w-fit block after:block after:content-[''] after:absolute after:h-[3px] after:bg-primary  after:-translate-x-1/2 after:translate-y-1 after:left-1/2 after:w-5 after:scale-x-0 after:hover:scale-x-100 after:transition after:duration-300 after:origin-center"}
      >
        سوالات متداول
      </Link>
    </nav>
  );
}
