import { describe, expect, it } from 'vitest';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import { EMPTY_FORM_VALUES } from './entryForm';
import {
  createEntryFormResolver,
  RESERVED_SLUGS,
  validateEntryValues,
  type ValidationContext,
} from './validateEntryForm';

describe('validateEntryForm', () => {
  const baseContext: ValidationContext = {
    entryType: 'post',
    sectionTemplates: [],
  };

  describe('validateEntryValues', () => {
    it('passes for valid default values (EMPTY_FORM_VALUES)', () => {
      const result = validateEntryValues(EMPTY_FORM_VALUES, baseContext);
      expect(result.valid).toBe(true);
      expect(result.fieldErrors).toEqual({});
      expect(result.sectionFieldErrors).toEqual({});
    });

    describe('slug validation', () => {
      it('returns error when slug contains invalid characters', () => {
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, slug: 'bad slug!' },
          baseContext
        );
        expect(result.valid).toBe(false);
        expect(result.fieldErrors.slug).toBe(
          'Slug must contain only alphanumeric characters and hyphens'
        );
      });

      it('returns error when slug is reserved by the system', () => {
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, slug: 'admin' },
          baseContext
        );
        expect(result.valid).toBe(false);
        expect(result.fieldErrors.slug).toBe("Slug 'admin' is reserved by the system");
      });

      it('returns error when slug is empty but title slugifies to a reserved slug', () => {
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, slug: '', title: 'Admin' },
          baseContext
        );
        expect(result.valid).toBe(false);
        expect(result.fieldErrors.slug).toBe("Slug 'admin' is reserved by the system");
      });

      it('verifies other reserved slugs fail validation', () => {
        for (const reserved of RESERVED_SLUGS) {
          const result = validateEntryValues(
            { ...EMPTY_FORM_VALUES, slug: reserved },
            baseContext
          );
          expect(result.valid).toBe(false);
          expect(result.fieldErrors.slug).toBe(`Slug '${reserved}' is reserved by the system`);
        }
      });

      it('returns error when slug duplicates an existing entry of different id', () => {
        const ctx: ValidationContext = {
          ...baseContext,
          existingEntries: [{ id: 10, slug: 'about' }],
          currentEntryId: '20',
        };
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, slug: 'about' },
          ctx
        );
        expect(result.valid).toBe(false);
        expect(result.fieldErrors.slug).toBe("An entry with slug 'about' already exists");
      });

      it('returns error on duplicate slug when currentEntryId is undefined', () => {
        const ctx: ValidationContext = {
          ...baseContext,
          existingEntries: [{ id: 10, slug: 'about' }],
          currentEntryId: undefined,
        };
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, slug: 'about' },
          ctx
        );
        expect(result.valid).toBe(false);
        expect(result.fieldErrors.slug).toBe("An entry with slug 'about' already exists");
      });

      it('passes when slug matches an existing entry with the same currentEntryId', () => {
        const ctx: ValidationContext = {
          ...baseContext,
          existingEntries: [{ id: 10, slug: 'about' }],
          currentEntryId: '10',
        };
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, slug: 'about' },
          ctx
        );
        expect(result.valid).toBe(true);
        expect(result.fieldErrors.slug).toBeUndefined();
      });
    });

    describe('canonicalUrl validation', () => {
      it('returns error for invalid URL strings or non-http/https protocols', () => {
        const badUrls = ['not-a-url', 'ftp://example.com', 'javascript:alert(1)'];
        for (const badUrl of badUrls) {
          const result = validateEntryValues(
            { ...EMPTY_FORM_VALUES, canonicalUrl: badUrl },
            baseContext
          );
          expect(result.valid).toBe(false);
          expect(result.fieldErrors.canonicalUrl).toBe(
            'Canonical URL must be a valid HTTP/HTTPS URL'
          );
        }
      });

      it('passes when canonicalUrl is valid http/https or empty', () => {
        const validUrls = ['', '   ', 'https://example.com/post', 'http://localhost:3000/docs'];
        for (const url of validUrls) {
          const result = validateEntryValues(
            { ...EMPTY_FORM_VALUES, canonicalUrl: url },
            baseContext
          );
          expect(result.fieldErrors.canonicalUrl).toBeUndefined();
        }
      });
    });

    describe('schemaJson validation', () => {
      it('returns error for malformed JSON, arrays, primitives, or null', () => {
        const badSchemas = ['{bad json', '[]', '[1, 2, 3]', '123', 'true', 'null'];
        for (const badSchema of badSchemas) {
          const result = validateEntryValues(
            { ...EMPTY_FORM_VALUES, schemaJson: badSchema },
            baseContext
          );
          expect(result.valid).toBe(false);
          expect(result.fieldErrors.schemaJson).toBe(
            'Schema JSON must be a valid JSON object'
          );
        }
      });

      it('passes when schemaJson is valid JSON object or empty', () => {
        const validSchemas = ['', '   ', '{"@context":"https://schema.org"}', '{"type": "Article"}'];
        for (const schema of validSchemas) {
          const result = validateEntryValues(
            { ...EMPTY_FORM_VALUES, schemaJson: schema },
            baseContext
          );
          expect(result.fieldErrors.schemaJson).toBeUndefined();
        }
      });
    });

    describe('parentId validation', () => {
      it('returns error when parentId is not a positive integer', () => {
        const badParents = ['abc', '0', '-5', '1.5', 'true'];
        for (const badParent of badParents) {
          const result = validateEntryValues(
            { ...EMPTY_FORM_VALUES, parentId: badParent },
            baseContext
          );
          expect(result.valid).toBe(false);
          expect(result.fieldErrors.parentId).toBe('Parent ID must be a positive integer');
        }
      });

      it('returns error when parentId equals currentEntryId (self-referential)', () => {
        const ctx: ValidationContext = {
          ...baseContext,
          currentEntryId: '42',
        };
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, parentId: '42' },
          ctx
        );
        expect(result.valid).toBe(false);
        expect(result.fieldErrors.parentId).toBe('Entry cannot be its own parent');
      });

      it('passes when parentId is a valid positive integer different from currentEntryId', () => {
        const ctx: ValidationContext = {
          ...baseContext,
          currentEntryId: '42',
        };
        const result = validateEntryValues(
          { ...EMPTY_FORM_VALUES, parentId: '10' },
          ctx
        );
        expect(result.fieldErrors.parentId).toBeUndefined();
      });
    });

    describe('section template required fields validation', () => {
      const templateWithRequiredFields: SectionTemplate = {
        id: 'hero',
        name: 'Hero Section',
        schema_json: JSON.stringify([
          { name: 'headline', type: 'text', label: 'Headline', required: true },
          { name: 'bio', type: 'richtext', label: 'Biography', required: true },
          { name: 'featured', type: 'boolean', label: 'Featured', required: true },
          { name: 'items', type: 'list', label: 'Items', required: true },
        ]),
      };

      it('populates sectionFieldErrors for missing required text, richtext, boolean, and list fields on pages', () => {
        const ctx: ValidationContext = {
          entryType: 'page',
          sectionTemplates: [templateWithRequiredFields],
        };

        const result = validateEntryValues(
          {
            ...EMPTY_FORM_VALUES,
            sections: [
              {
                type_id: 'hero',
                data: {
                  headline: '',
                  bio: '<p>   </p>',
                  featured: false,
                  items: [],
                },
              },
            ],
          },
          ctx
        );

        expect(result.valid).toBe(false);
        expect(result.sectionFieldErrors[0]).toEqual({
          headline: 'Headline is required',
          bio: 'Biography is required',
          featured: 'Featured is required',
          items: 'Items is required',
        });
      });

      it('passes when all required fields have valid values', () => {
        const ctx: ValidationContext = {
          entryType: 'page',
          sectionTemplates: [templateWithRequiredFields],
        };

        const result = validateEntryValues(
          {
            ...EMPTY_FORM_VALUES,
            sections: [
              {
                type_id: 'hero',
                data: {
                  headline: 'Great Title',
                  bio: '<p>Some real biography</p>',
                  featured: true,
                  items: ['item 1'],
                },
              },
            ],
          },
          ctx
        );

        expect(result.valid).toBe(true);
        expect(result.sectionFieldErrors).toEqual({});
      });

      it('skips section template validation when entryType is post', () => {
        const ctx: ValidationContext = {
          entryType: 'post',
          sectionTemplates: [templateWithRequiredFields],
        };

        const result = validateEntryValues(
          {
            ...EMPTY_FORM_VALUES,
            sections: [
              {
                type_id: 'hero',
                data: {
                  headline: '',
                  bio: '',
                  featured: false,
                  items: [],
                },
              },
            ],
          },
          ctx
        );

        expect(result.valid).toBe(true);
        expect(result.sectionFieldErrors).toEqual({});
      });
    });
  });

  describe('createEntryFormResolver', () => {
    it('returns empty errors object when form is valid', async () => {
      const resolver = createEntryFormResolver(() => baseContext);
      const res = await (resolver as any)(EMPTY_FORM_VALUES, undefined, {} as any);
      expect(res.errors).toEqual({});
      expect(res.values).toEqual(EMPTY_FORM_VALUES);
    });

    it('maps top-level and section field errors into react-hook-form error structure', async () => {
      const template: SectionTemplate = {
        id: 'hero',
        name: 'Hero',
        schema_json: JSON.stringify([
          { name: 'headline', type: 'text', label: 'Headline', required: true },
        ]),
      };
      const ctx: ValidationContext = {
        entryType: 'page',
        sectionTemplates: [template],
      };
      const resolver = createEntryFormResolver(() => ctx);

      const invalidValues = {
        ...EMPTY_FORM_VALUES,
        slug: 'bad slug!',
        sections: [{ type_id: 'hero', data: { headline: '' } }],
      };

      const res = await (resolver as any)(invalidValues, undefined, {} as any);
      expect(res.errors.slug).toEqual({
        type: 'validation',
        message: 'Slug must contain only alphanumeric characters and hyphens',
      });
      expect(res.errors.sections[0]).toEqual({
        data: {
          headline: {
            type: 'required',
            message: 'Headline is required',
          },
        },
      });
    });
  });
});
