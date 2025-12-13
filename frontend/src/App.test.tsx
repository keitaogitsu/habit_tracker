import { render, screen } from '@testing-library/react';

jest.mock('./api');
import { habitsAPI, habitLogsAPI, ping } from './api';
import App from './App';

test('renders app title', async () => {
  (ping as jest.Mock).mockResolvedValue({ data: 'ok' });
  (habitsAPI.getAll as jest.Mock).mockResolvedValue({
    data: [{ id: 1, title: 'テスト習慣', is_active: true, content: '' }],
  });
  (habitLogsAPI.getAll as jest.Mock).mockResolvedValue({ data: [] });

  render(<App />);
  const heading = await screen.findByRole('heading', { name: '習慣トラッカー' });
  expect(heading).toBeInTheDocument();
});
