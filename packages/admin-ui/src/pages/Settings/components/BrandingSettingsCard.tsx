import React, { useState, useEffect } from 'react';
import { Card, Heading, Box, Text, TextField, TextArea, Flex, Button, IconButton } from '@radix-ui/themes';
import { ImageIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useFormContext } from 'react-hook-form';
import { MediaPickerModal } from '../../../components/MediaPickerModal';
import { getPublicSiteUrl } from '../../../utils/api';
import type { SettingsFormValues } from '../types';

export const resolveMediaUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return getPublicSiteUrl(url);
};

export const BrandingSettingsCard: React.FC = () => {
  const { register, watch, setValue } = useFormContext<SettingsFormValues>();
  const [pickerTarget, setPickerTarget] = useState<'logo' | 'logoDark' | 'favicon' | 'og' | null>(null);

  const siteLogo = watch('siteLogo');
  const siteLogoDark = watch('siteLogoDark');
  const siteFavicon = watch('siteFavicon');
  const defaultOgImage = watch('defaultOgImage');
  const footerText = watch('footerText');

  const [logoError, setLogoError] = useState(false);
  const [logoDarkError, setLogoDarkError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [ogError, setOgError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [siteLogo]);

  useEffect(() => {
    setLogoDarkError(false);
  }, [siteLogoDark]);

  useEffect(() => {
    setFaviconError(false);
  }, [siteFavicon]);

  useEffect(() => {
    setOgError(false);
  }, [defaultOgImage]);

  const handleMediaSelect = (url: string) => {
    if (pickerTarget === 'logo') {
      setValue('siteLogo', url, { shouldDirty: true });
    } else if (pickerTarget === 'logoDark') {
      setValue('siteLogoDark', url, { shouldDirty: true });
    } else if (pickerTarget === 'favicon') {
      setValue('siteFavicon', url, { shouldDirty: true });
    } else if (pickerTarget === 'og') {
      setValue('defaultOgImage', url, { shouldDirty: true });
    }
    setPickerTarget(null);
  };

  return (
    <>
      <Card size="2">
        <Heading size="3" mb="3">
          Site Branding & Social
        </Heading>

        {/* Site Logo */}
        <Box mb="4">
          <Text as="label" htmlFor="settings-site-logo-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Site Logo
          </Text>
          <Flex gap="2" align="center">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                id="settings-site-logo-input"
                data-testid="settings-site-logo-input"
                aria-describedby="settings-site-logo-description"
                {...register('siteLogo')}
                placeholder="https://example.com/logo.png"
              />
            </Box>
            <Button
              type="button"
              variant="soft"
              data-testid="settings-choose-logo-button"
              onClick={() => setPickerTarget('logo')}
            >
              <ImageIcon /> Choose Image
            </Button>
            {siteLogo && (
              <IconButton
                type="button"
                variant="ghost"
                color="gray"
                aria-label="Clear site logo"
                data-testid="settings-clear-logo-button"
                onClick={() => setValue('siteLogo', '', { shouldDirty: true })}
              >
                <Cross2Icon />
              </IconButton>
            )}
          </Flex>
          <Text id="settings-site-logo-description" size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Replaces the text site title in the header on all public pages.
          </Text>
          {siteLogo && (
            <Box
              mt="2"
              p="2"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--gray-3)',
                borderRadius: '6px',
                border: '1px solid var(--gray-6)',
              }}
            >
              {logoError ? (
                <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                  Unable to load image preview
                </Text>
              ) : (
                <img
                  src={resolveMediaUrl(siteLogo)}
                  alt="Logo preview"
                  data-testid="settings-logo-preview"
                  style={{ maxHeight: '48px', maxWidth: '180px', objectFit: 'contain', display: 'block' }}
                  onError={() => setLogoError(true)}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Site Logo (Dark Mode) */}
        <Box mb="4">
          <Text as="label" htmlFor="settings-site-logo-dark-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Site Logo (Dark Mode)
          </Text>
          <Flex gap="2" align="center">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                id="settings-site-logo-dark-input"
                data-testid="settings-site-logo-dark-input"
                aria-describedby="settings-site-logo-dark-description"
                {...register('siteLogoDark')}
                placeholder="https://example.com/logo-dark.png"
              />
            </Box>
            <Button
              type="button"
              variant="soft"
              data-testid="settings-choose-logo-dark-button"
              onClick={() => setPickerTarget('logoDark')}
            >
              <ImageIcon /> Choose Image
            </Button>
            {siteLogoDark && (
              <IconButton
                type="button"
                variant="ghost"
                color="gray"
                aria-label="Clear dark mode logo"
                data-testid="settings-clear-logo-dark-button"
                onClick={() => setValue('siteLogoDark', '', { shouldDirty: true })}
              >
                <Cross2Icon />
              </IconButton>
            )}
          </Flex>
          <Text id="settings-site-logo-dark-description" size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Optional dark mode alternative. Displayed when visitors use dark mode. If unset, the main logo is used.
          </Text>
          {siteLogoDark && (
            <Box
              mt="2"
              p="2"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--gray-12)',
                borderRadius: '6px',
                border: '1px solid var(--gray-11)',
              }}
            >
              {logoDarkError ? (
                <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                  Unable to load image preview
                </Text>
              ) : (
                <img
                  src={resolveMediaUrl(siteLogoDark)}
                  alt="Dark mode logo preview"
                  data-testid="settings-logo-dark-preview"
                  style={{ maxHeight: '48px', maxWidth: '180px', objectFit: 'contain', display: 'block' }}
                  onError={() => setLogoDarkError(true)}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Favicon */}
        <Box mb="4">
          <Text as="label" htmlFor="settings-site-favicon-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Favicon
          </Text>
          <Flex gap="2" align="center">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                id="settings-site-favicon-input"
                data-testid="settings-site-favicon-input"
                aria-describedby="settings-site-favicon-description"
                {...register('siteFavicon')}
                placeholder="https://example.com/favicon.ico"
              />
            </Box>
            <Button
              type="button"
              variant="soft"
              data-testid="settings-choose-favicon-button"
              onClick={() => setPickerTarget('favicon')}
            >
              <ImageIcon /> Choose Image
            </Button>
            {siteFavicon && (
              <IconButton
                type="button"
                variant="ghost"
                color="gray"
                aria-label="Clear favicon"
                data-testid="settings-clear-favicon-button"
                onClick={() => setValue('siteFavicon', '', { shouldDirty: true })}
              >
                <Cross2Icon />
              </IconButton>
            )}
          </Flex>
          <Text id="settings-site-favicon-description" size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Browser tab and bookmark icon (supports .ico, .png, or .svg).
          </Text>
          {siteFavicon && (
            <Box
              mt="2"
              p="2"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--gray-3)',
                borderRadius: '6px',
                border: '1px solid var(--gray-6)',
              }}
            >
              {faviconError ? (
                <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                  Unable to load favicon preview
                </Text>
              ) : (
                <img
                  src={resolveMediaUrl(siteFavicon)}
                  alt="Favicon preview"
                  data-testid="settings-favicon-preview"
                  style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block' }}
                  onError={() => setFaviconError(true)}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Default OG Image */}
        <Box mb="4">
          <Text as="label" htmlFor="settings-default-og-image-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Default Social Share Image (Open Graph)
          </Text>
          <Flex gap="2" align="center">
            <Box style={{ flex: 1 }}>
              <TextField.Root
                id="settings-default-og-image-input"
                data-testid="settings-default-og-image-input"
                aria-describedby="settings-default-og-image-description"
                {...register('defaultOgImage')}
                placeholder="https://example.com/social-share.jpg"
              />
            </Box>
            <Button
              type="button"
              variant="soft"
              data-testid="settings-choose-default-og-image-button"
              onClick={() => setPickerTarget('og')}
            >
              <ImageIcon /> Choose Image
            </Button>
            {defaultOgImage && (
              <IconButton
                type="button"
                variant="ghost"
                color="gray"
                aria-label="Clear default social share image"
                data-testid="settings-clear-default-og-image-button"
                onClick={() => setValue('defaultOgImage', '', { shouldDirty: true })}
              >
                <Cross2Icon />
              </IconButton>
            )}
          </Flex>
          <Text id="settings-default-og-image-description" size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Fallback preview image used when sharing posts, pages, or the homepage on social platforms.
          </Text>
          {defaultOgImage && (
            <Box
              mt="2"
              p="2"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--gray-3)',
                borderRadius: '6px',
                border: '1px solid var(--gray-6)',
              }}
            >
              {ogError ? (
                <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                  Unable to load social share preview
                </Text>
              ) : (
                <img
                  src={resolveMediaUrl(defaultOgImage)}
                  alt="Social share preview"
                  data-testid="settings-default-og-preview"
                  style={{ maxHeight: '90px', maxWidth: '160px', objectFit: 'cover', borderRadius: '4px', display: 'block' }}
                  onError={() => setOgError(true)}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Footer Text */}
        <Box mb="2">
          <Text as="label" htmlFor="settings-footer-text-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Footer Text
          </Text>
          <TextArea
            id="settings-footer-text-input"
            data-testid="settings-footer-text-input"
            aria-describedby="settings-footer-text-description"
            {...register('footerText')}
            placeholder="e.g. © {{ year }} My Site. All rights reserved."
          />
          <Text id="settings-footer-text-description" size="1" color="gray" mt="1" style={{ display: 'block' }}>
            Custom copyright or disclaimer text rendered at the bottom of public pages. Supports {'{{ year }}'} for dynamic current year.
          </Text>
          {footerText && /\{\{\s*(year|current_year)\s*\}\}/i.test(footerText) && (
            <Text
              data-testid="settings-footer-text-preview"
              size="1"
              color="gray"
              mt="1"
              style={{ fontStyle: 'italic', display: 'block' }}
            >
              Preview: {footerText.replace(/\{\{\s*(year|current_year)\s*\}\}/gi, String(new Date().getFullYear()))}
            </Text>
          )}
        </Box>
      </Card>

      <MediaPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleMediaSelect}
      />
    </>
  );
};
