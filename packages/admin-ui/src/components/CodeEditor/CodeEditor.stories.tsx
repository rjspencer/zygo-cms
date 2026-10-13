import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Theme, Box } from '@radix-ui/themes';
import { CodeEditor } from './CodeEditor';
import { ThemeProvider } from '../../context/ThemeModeContext';
import type { CodeEditorProps } from './types';

const HTML_SAMPLE = `<section class="section-hero">
  <div class="hero-background" aria-hidden="true">
    {% if image %}
    <img src="{{ image|safe }}" alt="" class="hero-media" />
    {% endif %}
  </div>
  <div class="hero-content">
    <h1 class="hero-headline">{{ headline }}</h1>
    {% if subheadline %}<p class="hero-subheadline">{{ subheadline }}</p>{% endif %}
  </div>
</section>`;

const CSS_SAMPLE = `.section-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 6rem 1.5rem;
}
.hero-headline {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: #ffffff;
}`;

const UNFORMATTED_HTML_SAMPLE = `<section class="section-hero"><div class="hero-background" aria-hidden="true">{% if image %}<img src="{{ image|safe }}" alt="" class="hero-media" />{% endif %}</div><div class="hero-content"><h1 class="hero-headline">{{ headline }}</h1>{% if subheadline %}<p class="hero-subheadline">{{ subheadline }}</p>{% endif %}</div></section>`;

const ControlledCodeEditor: React.FC<CodeEditorProps> = (props) => {
  const [code, setCode] = useState(props.value);

  useEffect(() => {
    setCode(props.value);
  }, [props.value]);

  return (
    <CodeEditor
      {...props}
      value={code}
      onChange={(newVal) => {
        setCode(newVal);
        props.onChange?.(newVal);
      }}
    />
  );
};

const ThemedContainer: React.FC<{
  appearance: 'light' | 'dark';
  children: React.ReactNode;
}> = ({ appearance, children }) => {
  try {
    localStorage.setItem('zygo_admin_theme', appearance);
  } catch {
    // Ignore environments without localStorage access
  }

  return (
    <ThemeProvider key={appearance}>
      <Theme appearance={appearance} accentColor="cyan" grayColor="slate">
        <Box p="4" style={{ maxWidth: 800, backgroundColor: 'var(--color-background)' }}>
          {children}
        </Box>
      </Theme>
    </ThemeProvider>
  );
};

const meta = {
  title: 'Components/CodeEditor',
  component: CodeEditor,
  parameters: {
    layout: 'padded',
  },
  render: (args) => <ControlledCodeEditor {...args} />,
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HtmlLightMode: Story = {
  args: {
    language: 'html',
    value: HTML_SAMPLE,
    minHeight: 240,
    theme: 'light',
  },
  decorators: [
    (StoryComponent) => (
      <ThemedContainer appearance="light">
        <StoryComponent />
      </ThemedContainer>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /html template/i });
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(HTML_SAMPLE);
  },
};

export const HtmlDarkMode: Story = {
  args: {
    language: 'html',
    value: HTML_SAMPLE,
    minHeight: 240,
    theme: 'dark',
  },
  decorators: [
    (StoryComponent) => (
      <ThemedContainer appearance="dark">
        <StoryComponent />
      </ThemedContainer>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /html template/i });
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(HTML_SAMPLE);
  },
};

export const CssLightMode: Story = {
  args: {
    language: 'css',
    value: CSS_SAMPLE,
    minHeight: 240,
    theme: 'light',
  },
  decorators: [
    (StoryComponent) => (
      <ThemedContainer appearance="light">
        <StoryComponent />
      </ThemedContainer>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /css stylesheet/i });
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(CSS_SAMPLE);
  },
};

export const CssDarkMode: Story = {
  args: {
    language: 'css',
    value: CSS_SAMPLE,
    minHeight: 240,
    theme: 'dark',
  },
  decorators: [
    (StoryComponent) => (
      <ThemedContainer appearance="dark">
        <StoryComponent />
      </ThemedContainer>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /css stylesheet/i });
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(CSS_SAMPLE);
  },
};

export const InteractiveFormatOnBlur: Story = {
  args: {
    language: 'html',
    value: UNFORMATTED_HTML_SAMPLE,
    formatOnBlur: true,
    minHeight: 240,
  },
  decorators: [
    (StoryComponent) => (
      <ThemedContainer appearance="dark">
        <StoryComponent />
      </ThemedContainer>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /html template/i });
    await expect(textarea).toBeVisible();
    await userEvent.click(textarea);
    await userEvent.tab();
  },
};

export const Disabled: Story = {
  args: {
    language: 'html',
    value: HTML_SAMPLE,
    disabled: true,
    minHeight: 240,
  },
  decorators: [
    (StoryComponent) => (
      <ThemedContainer appearance="dark">
        <StoryComponent />
      </ThemedContainer>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /html template/i });
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeDisabled();
  },
};
