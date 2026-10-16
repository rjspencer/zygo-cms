import React, { useEffect } from 'react';
import { Dialog, Button, Flex, Box, Text, TextField } from '@radix-ui/themes';
import { FormProvider } from 'react-hook-form';
import { useCreateLinkForm } from '../../hooks';
import type { CreateLinkDialogProps } from '../../types';

export const CreateLinkDialog: React.FC<CreateLinkDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) => {
  const { methods, onSubmit: handleFormSubmit } = useCreateLinkForm(onSubmit);

  useEffect(() => {
    if (!isOpen) {
      methods.reset();
    }
  }, [isOpen, methods]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        <Button size="2">Create New</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
        <FormProvider {...methods}>
          <form onSubmit={handleFormSubmit}>
            <Dialog.Title>Create Trackable Link</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Generate a unique URL with tracking parameters for campaigns.
            </Dialog.Description>

            <Flex direction="column" gap="3">
              <Box>
                <Text as="label" size="2" mb="1" style={{ display: 'block' }}>
                  Campaign Name (Internal)
                </Text>
                <TextField.Root
                  {...methods.register('name')}
                  placeholder="e.g. Fall Newsletter"
                />
              </Box>
              <Box>
                <Text as="label" size="2" mb="1" style={{ display: 'block' }}>
                  utm_source
                </Text>
                <TextField.Root
                  {...methods.register('utmSource')}
                  placeholder="e.g. newsletter, twitter"
                />
              </Box>
              <Box>
                <Text as="label" size="2" mb="1" style={{ display: 'block' }}>
                  utm_medium
                </Text>
                <TextField.Root
                  {...methods.register('utmMedium')}
                  placeholder="e.g. email, social"
                />
              </Box>
              <Box>
                <Text as="label" size="2" mb="1" style={{ display: 'block' }}>
                  utm_campaign
                </Text>
                <TextField.Root
                  {...methods.register('utmCampaign')}
                  placeholder="e.g. fall_sale"
                />
              </Box>
              <Box>
                <Text as="label" size="2" mb="1" style={{ display: 'block' }}>
                  Custom Parameters
                </Text>
                <TextField.Root
                  {...methods.register('customParams')}
                  placeholder="e.g. affiliate_id=123&ref=home"
                />
              </Box>
            </Flex>

            <Flex gap="3" mt="5" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Link'}
              </Button>
            </Flex>
          </form>
        </FormProvider>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreateLinkDialog;
