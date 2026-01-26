import { Trophy, FileQuestion, Inbox } from 'lucide-react';

interface EmptyStateProps {
  type: 'active' | 'upcoming' | 'past' | 'attempts' | 'general';
  title?: string;
  description?: string;
}

const EmptyState = ({ type, title, description }: EmptyStateProps) => {
  const getContent = () => {
    switch (type) {
      case 'active':
        return {
          icon: Trophy,
          title: title || 'No Active Contests',
          description: description || 'There are no contests running right now. Check upcoming contests or practice your skills.',
        };
      case 'upcoming':
        return {
          icon: FileQuestion,
          title: title || 'No Upcoming Contests',
          description: description || 'No contests are scheduled at the moment. Check back later for new challenges.',
        };
      case 'past':
        return {
          icon: Trophy,
          title: title || 'No Past Contests',
          description: description || 'You haven\'t participated in any contests yet. Start your journey today!',
        };
      case 'attempts':
        return {
          icon: FileQuestion,
          title: title || 'No Contest Attempts',
          description: description || 'You haven\'t attempted any contests yet. Join a contest to get started!',
        };
      default:
        return {
          icon: Inbox,
          title: title || 'Nothing Here',
          description: description || 'No data available.',
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{content.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{content.description}</p>
    </div>
  );
};

export default EmptyState;
