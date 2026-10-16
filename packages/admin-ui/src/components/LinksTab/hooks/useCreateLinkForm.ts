import { useForm } from 'react-hook-form';
import type { CreateLinkFormValues } from '../types';

export const useCreateLinkForm = (
  onCreate: (payload: { name: string; url_params: string }) => void | Promise<void>
) => {
  const methods = useForm<CreateLinkFormValues>({
    defaultValues: {
      name: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      customParams: '',
    },
  });

  const onSubmit = methods.handleSubmit(async (data: CreateLinkFormValues) => {
    const params = new URLSearchParams();
    if (data.utmSource) params.append('utm_source', data.utmSource);
    if (data.utmMedium) params.append('utm_medium', data.utmMedium);
    if (data.utmCampaign) params.append('utm_campaign', data.utmCampaign);

    // Parse custom params (e.g. "key=value&other=123")
    if (data.customParams) {
      const customSearch = new URLSearchParams(data.customParams);
      customSearch.forEach((value, key) => {
        params.append(key, value);
      });
    }

    try {
      await onCreate({
        name: data.name || 'Unnamed Link',
        url_params: params.toString(),
      });
      methods.reset();
    } catch (err) {
      console.error('Failed to create link', err);
    }
  });

  return {
    methods,
    onSubmit,
    reset: methods.reset,
  };
};
