import { Braces, Database, Network, Pi, Zap } from 'lucide-react';
import type { Subject } from '../types';

export function SubjectIcon({ subject, size = 34 }: { subject: Subject; size?: number }) {
  const props = { size, strokeWidth: 2.5 };
  if (subject.iconName === 'database') return <Database {...props} />;
  if (subject.iconName === 'network') return <Network {...props} />;
  if (subject.iconName === 'bolt') return <Zap {...props} />;
  if (subject.iconName === 'code') return <Braces {...props} />;
  return <Pi {...props} />;
}
