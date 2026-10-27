import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import { Users, UserItem } from './index';

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
          const index = mockUsers.findIndex((u) => u.id === 1);
          if (index !== -1) mockUsers[index] = updatedUser;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatedUser),
          });
        }

        // DELETE /api/admin/users/2
        if (url.includes('/api/admin/users/2') && method === 'DELETE') {
          const index = mockUsers.findIndex((u) => u.id === 2);
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
    return render(<Users />);
  };

  it('renders page header, search bar, and invite user button', async () => {
    renderUsersPage();

    const heading = screen.getByRole('heading', { name: 'Users' });
    expect(heading.textContent).toBe('Users');
    expect(screen.getByText('Manage user accounts, roles, and profiles').textContent).toBe(
      'Manage user accounts, roles, and profiles'
    );

    const searchInput = screen.getByLabelText('Search users by name, email, or role');
    expect(searchInput.getAttribute('id')).toBe('users-search-input');
    expect(searchInput.getAttribute('placeholder')).toBe('Search users by name, email, or role...');

    const inviteBtn = screen.getByRole('button', { name: /invite user/i });
    expect(inviteBtn.hasAttribute('disabled')).toBe(false);
  });

  it('fetches and displays user list in table', async () => {
    renderUsersPage();

    const aliceName = await screen.findByText('Alice Admin');
    expect(aliceName.textContent).toBe('Alice Admin');
    expect(screen.getByText('admin@zygodactyl.io').textContent).toBe('admin@zygodactyl.io');
    expect(screen.getByText('admin').textContent).toBe('admin');
    expect(screen.getByText('Platform administrator and lead engineer.').textContent).toBe(
      'Platform administrator and lead engineer.'
    );

    expect(screen.getByText('Bob Author').textContent).toBe('Bob Author');
    expect(screen.getByText('bob@zygodactyl.io').textContent).toBe('bob@zygodactyl.io');
    expect(screen.getByText('author').textContent).toBe('author');
    expect(screen.getByText('bobwriter.com').textContent).toBe('bobwriter.com');
  });

  it('filters users by search query', async () => {
    const user = userEvent.setup();
    renderUsersPage();

    const aliceRow = await screen.findByText('Alice Admin');
    expect(aliceRow.textContent).toBe('Alice Admin');
    expect(screen.getByText('Bob Author').textContent).toBe('Bob Author');

    const searchInput = screen.getByLabelText('Search users by name, email, or role');
    await user.type(searchInput, 'alice');

    expect(screen.getByText('Alice Admin').textContent).toBe('Alice Admin');
    expect(screen.queryByText('Bob Author')).toBeNull();

    // Search query matching nobody
    await user.clear(searchInput);
    await user.type(searchInput, 'nonexistent');
    expect(screen.queryByText('Alice Admin')).toBeNull();
    expect(screen.getByText('No users found').textContent).toBe('No users found');
  });

  it('opens Invite User dialog and successfully invites a new user', async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText('Alice Admin');

    const inviteButton = screen.getByRole('button', { name: /invite user/i });
    await user.click(inviteButton);

    // Verify modal title
    const inviteHeading = screen.getByRole('heading', { name: 'Invite User' });
    expect(inviteHeading.textContent).toBe('Invite User');

    // Fill in form fields
    const emailInput = screen.getByLabelText(/Email Address/i);
    expect(emailInput.getAttribute('id')).toBe('invite-user-email-input');
    expect(emailInput.getAttribute('aria-invalid')).toBe('false');

    const nameInput = screen.getByLabelText('Display Name');
    expect(nameInput.getAttribute('id')).toBe('invite-user-display-name-input');

    const roleTrigger = screen.getByLabelText('Select role');
    expect(roleTrigger.getAttribute('id')).toBe('invite-user-role-trigger');

    const roleLabel = document.getElementById('invite-user-role-label');
    expect(roleLabel).not.toBeNull();
    expect(roleLabel?.getAttribute('for')).toBe('invite-user-role-trigger');

    await user.type(emailInput, 'charlie@zygodactyl.io');
    await user.type(nameInput, 'Charlie Editor');

    // Submit dialog form
    const submitBtn = screen.getByRole('button', { name: 'Invite User' });
    await user.click(submitBtn);

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
    const charlieName = await screen.findByText('Charlie Editor');
    expect(charlieName.textContent).toBe('Charlie Editor');
    expect(screen.getByText('charlie@zygodactyl.io').textContent).toBe('charlie@zygodactyl.io');

    // Verify invitation email template dialog is shown
    const userInvitedHeading = await screen.findByRole('heading', { name: 'User Invited' });
    expect(userInvitedHeading.textContent).toBe('User Invited');
    const emailTemplateArea = screen.getByLabelText('Invitation Email Template') as HTMLTextAreaElement;
    expect(emailTemplateArea.value).toContain('charlie@zygodactyl.io');
    expect(emailTemplateArea.value).toContain('Charlie Editor');
    expect(emailTemplateArea.value).toContain('/admin');

    // Click Copy Template button
    const copyBtn = screen.getByRole('button', { name: /Copy Template/i });
    await user.click(copyBtn);
    const copiedBtn = await screen.findByRole('button', { name: /Copied!/i });
    expect(copiedBtn.textContent).toContain('Copied!');
    expect(await navigator.clipboard.readText()).toContain('charlie@zygodactyl.io');

    // Dismiss dialog
    const doneBtn = screen.getByRole('button', { name: 'Done' });
    await user.click(doneBtn);
    expect(screen.queryByRole('heading', { name: 'User Invited' })).toBeNull();
  });

  it('displays error in Invite User dialog if backend returns an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

    const user = userEvent.setup();
    renderUsersPage();
    await screen.findByText('Alice Admin');

    const inviteButton = screen.getByRole('button', { name: /invite user/i });
    await user.click(inviteButton);

    const emailInput = screen.getByPlaceholderText('colleague@example.com');
    await user.type(emailInput, 'duplicate@zygodactyl.io');

    const submitBtn = screen.getByRole('button', { name: 'Invite User' });
    await user.click(submitBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.getAttribute('id')).toBe('invite-user-error-alert');
    expect(errorAlert.textContent).toContain('User with this email already exists');

    const emailInputWithErr = screen.getByLabelText(/Email Address/i);
    expect(emailInputWithErr.getAttribute('aria-invalid')).toBe('true');
    expect(emailInputWithErr.getAttribute('aria-describedby')).toBe('invite-user-error-alert');

    errorSpy.mockRestore();
  });

  it('opens Edit User dialog and updates user profile and role', async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText('Alice Admin');

    // Click edit button for Alice
    const editButton = screen.getByRole('button', { name: 'Edit Alice Admin' });
    await user.click(editButton);

    // Verify modal title
    const editHeading = screen.getByRole('heading', { name: 'Edit User' });
    expect(editHeading.textContent).toBe('Edit User');

    // Verify inputs populated with Alice's info
    const nameInput = screen.getByLabelText('Display Name');
    expect(nameInput.getAttribute('id')).toBe('edit-user-display-name-input');
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');

    const roleTrigger = screen.getByLabelText('Select role');
    expect(roleTrigger.getAttribute('id')).toBe('edit-user-role-trigger');

    const roleLabel = document.getElementById('edit-user-role-label');
    expect(roleLabel).not.toBeNull();
    expect(roleLabel?.getAttribute('for')).toBe('edit-user-role-trigger');

    const avatarUrlInput = screen.getByLabelText('Avatar URL');
    expect(avatarUrlInput.getAttribute('id')).toBe('edit-user-avatar-url-input');

    const websiteInput = screen.getByLabelText('Website');
    expect(websiteInput.getAttribute('id')).toBe('edit-user-website-input');

    const bioInput = screen.getByLabelText('Bio');
    expect(bioInput.getAttribute('id')).toBe('edit-user-bio-input');

    await user.clear(nameInput);
    await user.type(nameInput, 'Alice Senior Admin');
    await user.clear(websiteInput);
    await user.type(websiteInput, 'https://alice.dev');

    // Submit edit
    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(saveBtn);

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
    const updatedUser = await screen.findByText('Alice Senior Admin');
    expect(updatedUser.textContent).toBe('Alice Senior Admin');
    expect(screen.queryByRole('heading', { name: 'Edit User' })).toBeNull();
  });

  it('displays error in Edit User dialog with role alert and aria-invalid', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
        if (url.includes('/api/admin/users/1') && method === 'PUT') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Failed to update user' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    const user = userEvent.setup();
    renderUsersPage();
    await screen.findByText('Alice Admin');

    const editButton = screen.getByRole('button', { name: 'Edit Alice Admin' });
    await user.click(editButton);

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(saveBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert.getAttribute('id')).toBe('edit-user-error-alert');
    expect(errorAlert.textContent).toContain('Failed to update user');

    const nameInput = screen.getByLabelText('Display Name');
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput.getAttribute('aria-describedby')).toBe('edit-user-error-alert');

    errorSpy.mockRestore();
  });

  it('opens Delete dialog and soft deletes a user', async () => {
    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText('Bob Author');

    // Click delete button for Bob
    const deleteButton = screen.getByRole('button', { name: 'Delete Bob Author' });
    await user.click(deleteButton);

    // Confirmation dialog appears
    const deleteHeading = screen.getByRole('heading', { name: 'Delete User' });
    expect(deleteHeading.textContent).toBe('Delete User');
    expect(screen.getByText(/Are you sure you want to delete “Bob Author”?/i).textContent).toContain(
      'Are you sure you want to delete “Bob Author”?'
    );

    // Click Delete in confirmation dialog
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmDeleteBtn);

    // Verify DELETE request
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/2'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    // Verify Bob is removed from table and dialog is closed
    expect(screen.queryByText('Bob Author')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Delete User' })).toBeNull();
  });

  it('displays error callout when fetching users fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    const errorCallout = await screen.findByText('Database connection failed');
    expect(errorCallout.textContent).toBe('Database connection failed');
    errorSpy.mockRestore();
  });
});
