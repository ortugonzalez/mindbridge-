import React from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import Avatar from '../components/ui/Avatar';
import TypingIndicator from '../components/ui/TypingIndicator';

const DesignSystemPreview = () => {
  return (
    <div className="p-10 space-y-10 min-h-screen bg-[var(--color-background)]">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">BRESO Design System</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-[var(--color-text-muted)]">Toggle Theme</span>
          <Toggle />
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Inputs</h2>
        <div className="max-w-md space-y-4">
          <Input placeholder="Standard Input..." />
          <Input type="password" placeholder="Password Input..." />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-bold mb-2">Soledad's Profile</h3>
            <div className="flex items-center space-x-4">
              <Avatar size="lg" />
              <div>
                <p className="font-semibold">Soledad AI</p>
                <p className="text-sm text-[var(--color-text-muted)]">Tu acompañante inteligente</p>
              </div>
            </div>
            <div className="mt-4">
              <TypingIndicator />
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-bold mb-2">System Status</h3>
            <p className="text-[var(--color-text-muted)] mb-4">All systems are operational. The design system is now fully integrated with React components.</p>
            <Button variant="secondary" className="w-full">Check Logs</Button>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Avatars</h2>
        <div className="flex items-end gap-6">
          <Avatar size="sm" />
          <Avatar size="md" />
          <Avatar size="lg" />
          <Avatar size="xl" />
        </div>
      </section>
    </div>
  );
};

export default DesignSystemPreview;
