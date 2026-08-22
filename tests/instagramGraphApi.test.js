const { createMediaContainer, waitForContainer, publishContainer } = require('../lib/instagram/graphApi');

const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

describe('graph API client', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
    jest.restoreAllMocks();
  });

  test('creates the media container and returns its id', async () => {
    global.fetch.mockResolvedValue(json({ id: 'container-1' }));

    const id = await createMediaContainer({
      igUserId: 'ig-1', accessToken: 'secret', imageUrl: 'https://cdn/x.jpg', caption: 'hola',
    });

    expect(id).toBe('container-1');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v26.0/ig-1/media');
    expect(options.method).toBe('POST');
    expect(options.body.get('image_url')).toBe('https://cdn/x.jpg');
    expect(options.body.get('caption')).toBe('hola');
  });

  test('surfaces the Meta error message and code', async () => {
    global.fetch.mockResolvedValue(json({ error: { message: 'Invalid OAuth token', code: 190 } }, false, 400));

    await expect(createMediaContainer({ igUserId: 'ig-1', accessToken: 'secret' }))
      .rejects.toThrow('Graph API 400: Invalid OAuth token (code 190)');
  });

  test('polls until the container is FINISHED', async () => {
    global.fetch
      .mockResolvedValueOnce(json({ status_code: 'IN_PROGRESS' }))
      .mockResolvedValueOnce(json({ status_code: 'FINISHED' }));

    await waitForContainer({ containerId: 'c1', accessToken: 'secret', delayMs: 0 });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('gives up instead of publishing a container that never finished', async () => {
    global.fetch.mockResolvedValue(json({ status_code: 'IN_PROGRESS' }));

    await expect(waitForContainer({ containerId: 'c1', accessToken: 'secret', attempts: 3, delayMs: 0 }))
      .rejects.toThrow('container c1 was not FINISHED after 3 attempts');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('aborts as soon as the container reports ERROR', async () => {
    global.fetch.mockResolvedValue(json({ status_code: 'ERROR' }));

    await expect(waitForContainer({ containerId: 'c1', accessToken: 'secret', delayMs: 0 }))
      .rejects.toThrow('container c1 ended in status ERROR');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('publishes the container and returns the media id', async () => {
    global.fetch.mockResolvedValue(json({ id: 'media-9' }));

    const id = await publishContainer({ igUserId: 'ig-1', accessToken: 'secret', containerId: 'c1' });

    expect(id).toBe('media-9');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v26.0/ig-1/media_publish');
    expect(options.body.get('creation_id')).toBe('c1');
  });
});
