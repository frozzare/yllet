import expect from 'expect';
import FormData from 'isomorphic-form-data';
import fetchMock from 'fetch-mock';
import Transport from '../../src/Transport';
import { HTTPError } from '@yllet/support';

const transport = new Transport();
const endpoint = 'https://wp.com/wp-json';
const verbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

beforeEach(() => {
  fetchMock.reset();
});

describe('request calls', () => {
  verbs.forEach(verb => {
    it(`${verb} calls fetch once`, () => {
      fetchMock.once(endpoint, {});
      transport.request(verb, endpoint).catch(error => console.log(error));
      expect(fetchMock.calls().length).toEqual(1);
    });
  });
});

describe('verbs', () => {
  verbs.forEach(verb => {
    it(`${verb} sends correct http verb`, () => {
      fetchMock.once(
        endpoint,
        {},
        {
          method: verb
        }
      );
      transport.request(verb, endpoint);
      expect(fetchMock.calls()[0][1].method).toEqual(verb);
    });
  });
});

describe('url', () => {
  verbs.forEach(verb => {
    it(`${verb} calls correct url`, () => {
      fetchMock.once(endpoint, {});
      transport.request(verb, endpoint);
      expect(fetchMock.calls()[0][0]).toEqual(endpoint);
    });
  });
});

describe('headers', () => {
  const config = {
    headers: {
      'X-Foo': 'bar'
    }
  };

  verbs.forEach(verb => {
    it(`${verb} sends correct headers`, () => {
      fetchMock.once(endpoint, {});
      transport.request(verb, endpoint, {}, config);
      expect(fetchMock.calls()[0][1].headers).toEqual(
        new Headers(config.headers)
      );
    });
  });
});

describe('merge config', () => {
  const config = {
    foo: 'bar',
    bar: 'foo'
  };

  verbs.forEach(verb => {
    const expected = {
      ...config,
      method: verb,
      headers: new Headers()
    };

    if (['POST', 'PATCH', 'PUT'].includes(verb)) {
      expected.body = '{}';
    }

    it(`${verb} passes custom config`, () => {
      fetchMock.once(endpoint, {});
      transport.request(verb, endpoint, {}, config);
      expect(fetchMock.calls()[0][1]).toEqual(expected);
    });
  });
});

describe('with data', () => {
  const data = { foo: 'bar', posts: [21, 33, 150] };

  verbs.forEach(verb => {
    it(`${verb} sends data`, () => {
      if (['GET', 'DELETE'].includes(verb)) {
        fetchMock.once('*', {});
        transport.request(verb, endpoint, data);
        expect(fetchMock.calls()[0][0]).toBe(
          endpoint + '?foo=bar&posts[]=21&posts[]=33&posts[]=150'
        );
        expect(fetchMock.calls()[0][1].body).toBe(undefined);
      } else {
        fetchMock.once('*', {});
        transport.request(verb, endpoint, data);
        expect(fetchMock.calls()[0][1].body).toEqual(JSON.stringify(data));
      }
    });
  });
});

describe('with form data', () => {
  const formData = new FormData();
  formData.append('foo', 'bar');

  verbs.forEach(verb => {
    it(`${verb} sends form data`, () => {
      if (['GET', 'DELETE'].includes(verb)) {
        try {
          fetchMock.once(endpoint, {});
          transport.request(verb, endpoint, formData);
        } catch (error) {
          expect(error instanceof TypeError).toBe(true);
          expect(error.message).toBe(
            'Unable to encode FormData for GET, DELETE requests'
          );
        }
      } else {
        fetchMock.once(endpoint, {});
        transport.request(verb, endpoint, formData);
        expect(fetchMock.calls()[0][1].body instanceof FormData).toBe(true);
      }
    });
  });
});

describe('without data', () => {
  verbs.forEach(verb => {
    it(`${verb} sends data`, () => {
      fetchMock.once(endpoint, {});
      transport.request(verb, endpoint);
      if (['GET', 'DELETE'].includes(verb)) {
        expect(fetchMock.calls()[0][0]).toBe(endpoint);
        expect(fetchMock.calls()[0][1].body).toBe(undefined);
      } else {
        expect(fetchMock.calls()[0][1].body).toBe(undefined);
      }
    });
  });
});

describe('returns json', () => {
  verbs.forEach(verb => {
    it(`${verb} returns data`, () => {
      fetchMock.once(endpoint, { data: { mock: 'response' } });
      transport.request(verb, endpoint).then(response => {
        expect(response.data).toEqual({ mock: 'response' });
      });
    });
  });
});

describe('http exceptions', () => {
  const response = {
    status: 503,
    body: { foo: 'bar' }
  };

  verbs.forEach(verb => {
    it(`${verb} throws http exceptions`, () => {
      fetchMock.once('*', response);
      return transport.request(verb, endpoint).catch(error => {
        expect(error instanceof HTTPError).toBe(true);
        expect(error.response).toEqual({ foo: 'bar' });
      });
    });
  });
});
