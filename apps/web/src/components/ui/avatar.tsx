import { cn, initials } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary',
        className
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={name} className={cn('h-8 w-8 rounded-full object-cover', className)} />;
  }
  return <Avatar name={name} className={className} />;
}
