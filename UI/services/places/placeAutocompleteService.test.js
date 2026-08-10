import {
  fetchAddressFromCoordinates,
  fetchDenuePlaceSuggestions,
  fetchNominatimPlaceSuggestions,
  fetchPlaceSuggestions,
  getDenueToken,
  getPlaceAutocompleteBaseUrl,
  normalizeDenueSuggestions,
  normalizeNominatimSuggestions,
  normalizePlaceSuggestions,
} from './placeAutocompleteService';

describe('placeAutocompleteService', () => {
  test('uses Photon as the default no-key autocomplete provider', () => {
    expect(getPlaceAutocompleteBaseUrl()).toBe('https://photon.komoot.io');
  });

  test('keeps DENUE disabled until a token is configured', () => {
    expect(getDenueToken()).toBe('');
  });

  test('normalizes Photon feature results', () => {
    expect(
      normalizePlaceSuggestions({
        features: [
          {
            geometry: {
              coordinates: [-103.3475, 20.6767],
            },
            properties: {
              city: 'Guadalajara',
              country: 'México',
              name: 'Panadería Centro',
              osm_id: 123,
              state: 'Jalisco',
            },
          },
          {
            properties: {
              housenumber: '45',
              name: 'Calle Reforma',
              street: 'Reforma',
            },
          },
          {},
        ],
      }),
    ).toEqual([
      {
        description: 'Panadería Centro, Guadalajara, Jalisco, México',
        id: 'place-123',
        latitude: 20.6767,
        longitude: -103.3475,
      },
      {
        description: 'Calle Reforma, Reforma, 45',
        id: 'place-1',
        latitude: null,
        longitude: null,
      },
    ]);
  });

  test('does not call provider without enough text', async () => {
    const fetchImpl = jest.fn();

    await expect(
      fetchPlaceSuggestions('ab', { fetchImpl }),
    ).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('calls Photon search without api key', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          features: [
            {
              geometry: {
                coordinates: [-103.39, 20.72],
              },
              properties: {
                city: 'Zapopan',
                country: 'México',
                name: 'Cafetería Norte',
                osm_id: 456,
              },
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => [],
        ok: true,
      });

    await expect(
      fetchPlaceSuggestions('Cafetería Norte', {
        baseUrl: 'https://photon.example.test',
        fetchImpl,
        limit: 5,
      }),
    ).resolves.toEqual([
      {
        description: 'Cafetería Norte, Zapopan, México',
        id: 'place-456',
        latitude: 20.72,
        longitude: -103.39,
      },
    ]);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://photon.example.test/api?'),
    );
    const requestedUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get('q')).toBe('Cafetería Norte');
    expect(requestedUrl.searchParams.get('limit')).toBe('5');
    expect(requestedUrl.searchParams.get('lang')).toBe('default');
  });

  test('normalizes Nominatim place results', () => {
    expect(
      normalizeNominatimSuggestions([
        {
          display_name:
            'Tacos Centro, Calle Reforma, Guadalajara, Jalisco, México',
          lat: '20.6767',
          lon: '-103.3475',
          osm_id: 987,
          osm_type: 'node',
        },
      ]),
    ).toEqual([
      {
        description:
          'Tacos Centro, Calle Reforma, Guadalajara, Jalisco, México',
        id: 'nominatim-node-987',
        latitude: 20.6767,
        longitude: -103.3475,
      },
    ]);
  });

  test('normalizes DENUE establishment results', () => {
    expect(
      normalizeDenueSuggestions([
        {
          Calle: 'HIDALGO',
          CLEE: 'ABC',
          Colonia: 'CENTRO',
          CP: '44100',
          Id: '12345',
          Latitud: '20.6767',
          Longitud: '-103.3475',
          Nombre: 'BUFETE ORELLANA',
          Num_Exterior: '232',
          Tipo_vialidad: 'AVENIDA',
          Ubicacion: 'Guadalajara, Jalisco, México',
        },
      ]),
    ).toEqual([
      {
        description:
          'BUFETE ORELLANA, AVENIDA, HIDALGO, 232, CENTRO, CP 44100, Guadalajara, Jalisco, México',
        id: 'denue-12345',
        latitude: 20.6767,
        longitude: -103.3475,
      },
    ]);
  });

  test('does not call DENUE without token', async () => {
    const fetchImpl = jest.fn();

    await expect(
      fetchDenuePlaceSuggestions('BUFETE ORELLANA', { fetchImpl }),
    ).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('calls DENUE BuscarEntidad with configured token', async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => [
        {
          Calle: 'HIDALGO',
          Id: '12345',
          Latitud: '20.6767',
          Longitud: '-103.3475',
          Nombre: 'BUFETE ORELLANA',
          Ubicacion: 'Guadalajara, Jalisco, México',
        },
      ],
      ok: true,
    }));

    await expect(
      fetchDenuePlaceSuggestions('BUFETE ORELLANA', {
        baseUrl: 'https://denue.example.test/consulta',
        entity: '14',
        fetchImpl,
        limit: 3,
        token: 'TOKEN_TEST',
      }),
    ).resolves.toEqual([
      {
        description:
          'BUFETE ORELLANA, HIDALGO, Guadalajara, Jalisco, México',
        id: 'denue-12345',
        latitude: 20.6767,
        longitude: -103.3475,
      },
    ]);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://denue.example.test/consulta/BuscarEntidad/BUFETE%20ORELLANA/14/1/3/TOKEN_TEST',
    );
  });

  test('calls Nominatim for real establishments and addresses', async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => [
        {
          display_name:
            'Panadería Real, Avenida Hidalgo, Guadalajara, Jalisco, México',
          lat: '20.67',
          lon: '-103.34',
          osm_id: 222,
          osm_type: 'way',
        },
      ],
      ok: true,
    }));

    await expect(
      fetchNominatimPlaceSuggestions('Panadería Real', {
        baseUrl: 'https://nominatim.example.test',
        countryCode: 'mx',
        fetchImpl,
        limit: 4,
      }),
    ).resolves.toEqual([
      {
        description:
          'Panadería Real, Avenida Hidalgo, Guadalajara, Jalisco, México',
        id: 'nominatim-way-222',
        latitude: 20.67,
        longitude: -103.34,
      },
    ]);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(requestedUrl.origin).toBe('https://nominatim.example.test');
    expect(requestedUrl.pathname).toBe('/search');
    expect(requestedUrl.searchParams.get('q')).toBe('Panadería Real');
    expect(requestedUrl.searchParams.get('format')).toBe('jsonv2');
    expect(requestedUrl.searchParams.get('addressdetails')).toBe('1');
    expect(requestedUrl.searchParams.get('countrycodes')).toBe('mx');
    expect(requestedUrl.searchParams.get('layer')).toBe('poi,address');
    expect(requestedUrl.searchParams.get('limit')).toBe('4');
  });

  test('combines Photon and Nominatim suggestions', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          features: [
            {
              geometry: {
                coordinates: [-103.39, 20.72],
              },
              properties: {
                city: 'Zapopan',
                country: 'México',
                name: 'Calle Norte',
                osm_id: 456,
              },
            },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            display_name:
              'Cafetería Norte, Zapopan, Jalisco, México',
            lat: '20.73',
            lon: '-103.4',
            osm_id: 999,
            osm_type: 'node',
          },
        ],
        ok: true,
      });

    await expect(
      fetchPlaceSuggestions('Cafetería Norte', {
        baseUrl: 'https://photon.example.test',
        fetchImpl,
        limit: 5,
      }),
    ).resolves.toEqual([
      {
        description: 'Calle Norte, Zapopan, México',
        id: 'place-456',
        latitude: 20.72,
        longitude: -103.39,
      },
      {
        description: 'Cafetería Norte, Zapopan, Jalisco, México',
        id: 'nominatim-node-999',
        latitude: 20.73,
        longitude: -103.4,
      },
    ]);
  });

  test('prioritizes DENUE suggestions when token is provided', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => [
          {
            Calle: 'HIDALGO',
            Id: '12345',
            Latitud: '20.6767',
            Longitud: '-103.3475',
            Nombre: 'BUFETE ORELLANA',
            Ubicacion: 'Guadalajara, Jalisco, México',
          },
        ],
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ features: [] }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => [],
        ok: true,
      });

    await expect(
      fetchPlaceSuggestions('BUFETE ORELLANA', {
        baseUrl: 'https://photon.example.test',
        fetchImpl,
        limit: 5,
        denueToken: 'TOKEN_TEST',
      }),
    ).resolves.toEqual([
      {
        description:
          'BUFETE ORELLANA, HIDALGO, Guadalajara, Jalisco, México',
        id: 'denue-12345',
        latitude: 20.6767,
        longitude: -103.3475,
      },
    ]);
  });

  test('reverse geocodes coordinates with Photon', async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => ({
        features: [
          {
            geometry: {
              coordinates: [-103.3475, 20.6767],
            },
            properties: {
              city: 'Guadalajara',
              country: 'México',
              name: 'Calle Morelos',
              osm_id: 789,
              osm_type: 'W',
              state: 'Jalisco',
            },
          },
        ],
      }),
      ok: true,
    }));

    await expect(
      fetchAddressFromCoordinates(
        { latitude: 20.6767, longitude: -103.3475 },
        { baseUrl: 'https://photon.example.test', fetchImpl },
      ),
    ).resolves.toBe('Calle Morelos, Guadalajara, Jalisco, México');

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://photon.example.test/reverse?'),
    );
    const requestedUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get('lat')).toBe('20.6767');
    expect(requestedUrl.searchParams.get('lon')).toBe('-103.3475');
  });
});
