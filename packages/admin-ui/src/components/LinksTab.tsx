import React, { useState } from 'react';
import { Flex, Box, Text, Button, Table, Dialog, TextField, IconButton } from '@radix-ui/themes';
import { CopyIcon, TrashIcon, CheckIcon } from '@radix-ui/react-icons';
import { QRCodeDialog } from './QRCodeDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

interface TrackableLink {
  id: number;
  entry_id: number;
  name: string;
  url_params: string;
  created_at: string;
}

interface LinksTabProps {
  entryId: string | undefined;
  baseCanonicalUrl: string;
  isSaved: boolean;
}

export const LinksTab: React.FC<LinksTabProps> = ({ entryId, baseCanonicalUrl, isSaved }) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [customParams, setCustomParams] = useState('');

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const { data: links = [], isLoading } = useQuery<TrackableLink[]>({
    queryKey: ['trackable_links', entryId],
    queryFn: async () => {
      const res = await apiFetch(`/api/entries/${entryId}/links`);
      if (!res.ok) throw new Error('Failed to fetch links');
      return res.json();
    },
    enabled: !!entryId && entryId !== 'new',
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; url_params: string }) => {
      const res = await apiFetch(`/api/entries/${entryId}/links`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackable_links', entryId] });
      setIsCreateOpen(false);
      setNewLinkName('');
      setUtmSource('');
      setUtmMedium('');
      setUtmCampaign('');
      setCustomParams('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: number) => {
      const res = await apiFetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackable_links', entryId] });
    },
  });

  const handleCreate = () => {
    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    
    // Parse custom params (e.g. "key=value&other=123")
    if (customParams) {
      const customSearch = new URLSearchParams(customParams);
      customSearch.forEach((value, key) => {
        params.append(key, value);
      });
    }

    createMutation.mutate({
      name: newLinkName || 'Unnamed Link',
      url_params: params.toString(),
    });
  };

  const absoluteCanonicalUrl = baseCanonicalUrl.startsWith('http') 
    ? baseCanonicalUrl 
    : `${(settings.canonical_origin || '').replace(/\/+$/, '')}/${baseCanonicalUrl.replace(/^\/+/, '')}`;

  const constructFullUrl = (paramsString: string) => {
    const divider = absoluteCanonicalUrl.includes('?') ? '&' : '?';
    return paramsString ? `${absoluteCanonicalUrl}${divider}${paramsString}` : absoluteCanonicalUrl;
  };

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (!entryId || entryId === 'new' || !isSaved) {
    return (
      <Box p="4" style={{ background: 'var(--gray-3)', borderRadius: '8px' }}>
        <Text color="gray">
          Please save the entry first before generating trackable links.
        </Text>
      </Box>
    );
  }

  return (
    <Flex direction="column" gap="5">
      {/* Canonical Link Section */}
      <Box p="4" style={{ background: 'var(--gray-2)', borderRadius: '8px', border: '1px solid var(--gray-4)' }}>
        <Text as="label" size="2" weight="bold" mb="2" style={{ display: 'block' }}>
          Canonical URL
        </Text>
        <Flex gap="3" align="center">
          <TextField.Root size="2" value={absoluteCanonicalUrl} readOnly style={{ flex: 1 }}>
            <TextField.Slot>
              <IconButton size="1" variant="ghost" onClick={() => handleCopy(absoluteCanonicalUrl)}>
                {copiedLink === absoluteCanonicalUrl ? <CheckIcon color="green" /> : <CopyIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
          <QRCodeDialog url={absoluteCanonicalUrl} trigger={<Button variant="outline">QR Code</Button>} />
        </Flex>
      </Box>

      {/* Trackable URLs Section */}
      <Box>
        <Flex justify="between" align="center" mb="3">
          <Text size="3" weight="bold">Trackable Links</Text>
          <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Dialog.Trigger>
              <Button size="2">Create New</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="450px">
              <Dialog.Title>Create Trackable Link</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Generate a unique URL with tracking parameters for campaigns.
              </Dialog.Description>

              <Flex direction="column" gap="3">
                <Box>
                  <Text as="label" size="2" mb="1" style={{ display: 'block' }}>Campaign Name (Internal)</Text>
                  <TextField.Root value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="e.g. Fall Newsletter" />
                </Box>
                <Box>
                  <Text as="label" size="2" mb="1" style={{ display: 'block' }}>utm_source</Text>
                  <TextField.Root value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="e.g. newsletter, twitter" />
                </Box>
                <Box>
                  <Text as="label" size="2" mb="1" style={{ display: 'block' }}>utm_medium</Text>
                  <TextField.Root value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="e.g. email, social" />
                </Box>
                <Box>
                  <Text as="label" size="2" mb="1" style={{ display: 'block' }}>utm_campaign</Text>
                  <TextField.Root value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="e.g. fall_sale" />
                </Box>
                <Box>
                  <Text as="label" size="2" mb="1" style={{ display: 'block' }}>Custom Parameters</Text>
                  <TextField.Root value={customParams} onChange={e => setCustomParams(e.target.value)} placeholder="e.g. affiliate_id=123&ref=home" />
                </Box>
              </Flex>

              <Flex gap="3" mt="5" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">Cancel</Button>
                </Dialog.Close>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Link'}
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        {isLoading ? (
          <Text color="gray">Loading links...</Text>
        ) : links.length === 0 ? (
          <Text color="gray" size="2">No trackable links created yet.</Text>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Parameters</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {links.map((link) => {
                const fullUrl = constructFullUrl(link.url_params);
                return (
                  <Table.Row key={link.id} align="center">
                    <Table.RowHeaderCell>{link.name}</Table.RowHeaderCell>
                    <Table.Cell>
                      <Text size="1" color="gray" style={{ wordBreak: 'break-all' }}>
                        ?{link.url_params}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2" justify="end" align="center">
                        <IconButton size="1" variant="soft" onClick={() => handleCopy(fullUrl)} title="Copy URL">
                          {copiedLink === fullUrl ? <CheckIcon color="green" /> : <CopyIcon />}
                        </IconButton>
                        <QRCodeDialog url={fullUrl} trigger={<Button size="1" variant="soft">QR Code</Button>} />
                        <IconButton 
                          size="1" 
                          variant="soft" 
                          color="red" 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this link?')) {
                              deleteMutation.mutate(link.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon />
                        </IconButton>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Flex>
  );
};
