import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../test/test-utils';
import { Theme } from '@radix-ui/themes';
import { Users, UserItem } from '../pages/Users';

describe('Users Page Component', () => {
  let mockUsers: UserItem[] = [];

  beforeEach(() => {
    mockUsers = [
      {
        id: 1,
        auth_provider_id: 'cf-access-1',
        email: 'admin@zygodactyl.io',
        display_name: 'Alice Admin',
        role: 'admin',
        bio: 'Platform administrator and lead engineer.',
        website: 'https://zygodactyl.io',
        avatar_url: 'https://example.com/alice.png',
        created_at: '2026-08-01 10:00:00',
        updated_at: '2026-08-01 10:00:00',
        deleted_at: null,
      },
      {
        id: 2,
        auth_provider_id: 'cf-access-2',
        email: 'bob@zygodactyl.io',
        display_name: 'Bob Author',
        role: 'author',
        bio: 'Tech writer and documentation author.',
        website: 'bobwriter.com',
        avatar_url: null,
        created_at: '2026-08-15 14:30:00',
        updated_at: '2026-08-15 14:30:00',
        deleted_at: null,
      },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options: any = {}) => {
        const method = options.method || 'GET';

        // GET /api/admin/users
        if (url.includes('/api/admin/users') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([...mockUsers]),
          });
        }

        // POST /api/admin/users
        if (url.includes('/api/admin/users') && method === 'POST') {
          const body = JSON.parse(options.body || '{}');
          const newUser: UserItem = {
            id: 3,
            auth_provider_id: 'cf-access-3',
            email: body.email,
            display_name: body.display_name || null,
            role: body.role || 'author',
            bio: null,
            website: null,
            avatar_url: null,
            created_at: '2026-10-01 12:00:00',
            updated_at: '2026-10-01 12:00:00',
            deleted_at: null,
          };
          mockUsers.push(newUser);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(newUser),
          });
        }

        // PUT /api/admin/users/1
        if (url.includes('/api/admin/users/1') && method === 'PUT') {
          const body = JSON.parse(options.body || '{}');
          const updatedUser: UserItem = {
            ...mockUsers[0],
            display_name: body.display_name,
            role: body.role,
            bio: body.bio,
            website: body.website,
            avatar_url: body.avatar_url,
            updated_at: '2026-10-01 12:30:00',
          };
          const index = mockUsers.findIndex(u => u.id === 1);
          if (index !== -1) mockUsers[index] = updatedUser;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatedUser),
          });
        }

        // DELETE /api/admin/users/2
        if (url.includes('/api/admin/users/2') && method === 'DELETE') {
          const index = mockUsers.findIndex(u => u.id === 2);
          if (index !== -1) mockUsers.splice(index, 1);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, deleted: 2 }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const renderUsersPage = () => {
    return render(
      <Theme>
        <Users />
      </Theme>
    );
  };

  it('renders page header, search bar, and invite user button', async () => {
    renderUsersPage();

    expect(screen.getByRole('heading', { name: 'Users' })).toBeDefined();
    expect(screen.getByText('Manage user accounts, roles, and profiles')).toBeDefined();
    expect(screen.getByPlaceholderText('Search users by name, email, or role...')).toBeDefined();
    expect(screen.getByRole('button', { name: /invite user/i })).toBeDefined();
  });

  it('fetches and displays user list in table', async () => {
    renderUsersPage();

    expect(await screen.findByText('Alice Admin')).toBeDefined();
    expect(screen.getByText('admin@zygodactyl.io')).toBeDefined();
    expect(screen.getByText('admin')).toBeDefined();
    expect(screen.getByText('Platform administrator and lead engineer.')).toBeDefined();

    expect(screen.getByText('Bob Author')).toBeDefined();
    expect(screen.getByText('bob@zygodactyl.io')).toBeDefined();
    expect(screen.getByText('author')).toBeDefined();
    expect(screen.getByText('bobwriter.com')).toBeDefined();
  });

  it('filters users by search query', async () => {
    renderUsersPage();

    expect(await screen.findByText('Alice Admin')).toBeDefined();
    expect(screen.getByText('Bob Author')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Search users by name, email, or role...');
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(screen.getByText('Alice Admin')).toBeDefined();
    expect(screen.queryByText('Bob Author')).toBeNull();

    // Search query matching nobody
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.queryByText('Alice Admin')).toBeNull();
    expect(screen.getByText('No users found')).toBeDefined();
  });

  it('opens Invite User dialog and successfully invites a new user', async () => {
    renderUsersPage();

    expect(await screen.findByText('Alice Admin')).toBeDefined();

    const inviteButton = screen.getByRole('button', { name: /invite user/i });
    fireEvent.click(inviteButton);

    // Verify modal title
    expect(screen.getByRole('heading', { name: 'Invite User' })).toBeDefined();

    // Fill in form fields
    const emailInput = screen.getByPlaceholderText('colleague@example.com');
    const nameInput = screen.getByPlaceholderText('e.g. Jane Doe');

    fireEvent.change(emailInput, { target: { value: 'charlie@zygodactyl.io' } });
    fireEvent.change(nameInput, { target: { value: 'Charlie Editor' } });

    // Submit dialog form
    const submitBtn = screen.getByRole('button', { name: 'Invite User' });
    fireEvent.click(submitBtn);

    // Verify fetch was called with POST and correct payload
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'charlie@zygodactyl.io',
            display_name: 'Charlie Editor',
            role: 'author',
          }),
        })
      );
    });

    // Verify new user is added to table
    expect(await screen.findByText('Charlie Editor')).toBeDefined();
    expect(screen.getByText('charlie@zygodactyl.io')).toBeDefined();

    // Verify invitation email template dialog is shown
    expect(await screen.findByText('User Invited')).toBeDefined();
    const emailTemplateArea = screen.getByLabelText('Invitation Email Template') as HTMLTextAreaElement;
    expect(emailTemplateArea.value).toContain('charlie@zygodactyl.io');
    expect(emailTemplateArea.value).toContain('Charlie Editor');
    expect(emailTemplateArea.value).toContain('/admin');

    // Click Copy Template button
    const copyBtn = screen.getByRole('button', { name: /Copy Template/i });
    fireEvent.click(copyBtn);

    // Dismiss dialog
    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);
  });

  it('displays error in Invite User dialog if backend returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options: any = {}) => {
        const method = options.method || 'GET';
        if (url.includes('/api/admin/users') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([...mockUsers]),
          });
        }
        if (url.includes('/api/admin/users') && method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'User with this email already exists' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    renderUsersPage();
    expect(await screen.findByText('Alice Admin')).toBeDefined();

    const inviteButton = screen.getByRole('button', { name: /invite user/i });
    fireEvent.click(inviteButton);

    const emailInput = screen.getByPlaceholderText('colleague@example.com');
    fireEvent.change(emailInput, { target: { value: 'duplicate@zygodactyl.io' } });

    const submitBtn = screen.getByRole('button', { name: 'Invite User' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('User with this email already exists')).toBeDefined();
  });

  it('opens Edit User dialog and updates user profile and role', async () => {
    renderUsersPage();

    expect(await screen.findByText('Alice Admin')).toBeDefined();

    // Click edit button for Alice
    const editButton = screen.getByRole('button', { name: 'Edit Alice Admin' });
    fireEvent.click(editButton);

    // Verify modal title
    expect(screen.getByRole('heading', { name: 'Edit User' })).toBeDefined();

    // Verify inputs populated with Alice's info
    const nameInput = screen.getByDisplayValue('Alice Admin');
    const websiteInput = screen.getByDisplayValue('https://zygodactyl.io');

    fireEvent.change(nameInput, { target: { value: 'Alice Senior Admin' } });
    fireEvent.change(websiteInput, { target: { value: 'https://alice.dev' } });

    // Submit edit
    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveBtn);

    // Verify PUT request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            role: 'admin',
            display_name: 'Alice Senior Admin',
            bio: 'Platform administrator and lead engineer.',
            website: 'https://alice.dev',
            avatar_url: 'https://example.com/alice.png',
          }),
        })
      );
    });

    // Check table updated
    expect(await screen.findByText('Alice Senior Admin')).toBeDefined();
  });

  it('opens Delete dialog and soft deletes a user', async () => {
    renderUsersPage();

    expect(await screen.findByText('Bob Author')).toBeDefined();

    // Click delete button for Bob
    const deleteButton = screen.getByRole('button', { name: 'Delete Bob Author' });
    fireEvent.click(deleteButton);

    // Confirmation dialog appears
    expect(screen.getByRole('heading', { name: 'Delete User' })).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete “Bob Author”?/i)).toBeDefined();

    // Click Delete in confirmation dialog
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);

    // Verify DELETE request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/2'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    // Verify Bob is removed from table
    await waitFor(() => {
      expect(screen.queryByText('Bob Author')).toBeNull();
    });
  });

  it('displays error callout when fetching users fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('Database connection failed'),
        })
      )
    );

    renderUsersPage();
    expect(await screen.findByText('Database connection failed')).toBeDefined();
  });
});
