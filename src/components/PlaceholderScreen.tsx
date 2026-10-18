import type { ReactNode } from 'react';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/StateViews';

type Props = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderScreen({ title, description, children }: Props) {
  return (
    <Screen>
      <EmptyState title={title} message={description} />
      {children}
    </Screen>
  );
}
