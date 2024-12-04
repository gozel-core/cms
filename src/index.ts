export const cms = (function cmsAutoInit() {
    let _businesses: DirectusBusiness[] = [];
    let _languages: DirectusLanguage[] = [];
    let _settings: DirectusCmsSettings = {
        maintenance_mode: true,
        search_engine_indexing: false,
    };
    const routeLoaders: DirectusCmsRouteLoaders = {};
    const currentLoadingRoutes: string[] = [];
    const routeCatalog: Record<string, DirectusCmsRoute[]> = {};
    let _routes: DirectusCmsRoute[] = [];
    let _currentLocale = "";

    const api = {
        setBusinesses(businesses: DirectusBusiness[]) {
            _businesses = businesses;
        },
        getBusinesses(kind?: string) {
            return kind
                ? _businesses.filter((b) => b.kind === kind)
                : _businesses;
        },
        getPrimaryBusiness() {
            return _businesses.find((b) => b.kind === "main");
        },

        setLanguages(languages: DirectusLanguage[]) {
            _languages = languages;
        },
        getLanguages() {
            return _languages;
        },
        getDefaultLanguage() {
            return _languages.find(({ is_default }) => is_default === true);
        },

        setSettings(settings: DirectusCmsSettings) {
            _settings = settings;
        },
        isUnderMaintenance() {
            return _settings.maintenance_mode;
        },
        isSearchEngineIndexingEnabled() {
            return _settings.search_engine_indexing;
        },

        registerRouteLoader(locale: string, loader: DirectusCmsRouteLoader) {
            routeLoaders[locale] = loader;
            return this;
        },
        registerRouteLoaders(obj: DirectusCmsRouteLoaders) {
            Object.keys(obj).map((filepath) => {
                const locale = extractLocaleFromFilePath(filepath);
                if (!locale)
                    throw new Error(
                        `Failed to extract locale from "${filepath}". The locale should be in aa-AA or aa_AA form.`,
                    );
                routeLoaders[locale] = obj[filepath]!;
            });
            return this;
        },
        loadAllRoutes(obj: Record<string, DirectusCmsRoute[]>) {
            Object.keys(obj).map((filepath) => {
                const locale = extractLocaleFromFilePath(filepath);
                if (!locale)
                    throw new Error(
                        `Failed to extract locale from "${filepath}". The locale should be in aa-AA or aa_AA form.`,
                    );
                routeCatalog[locale] = obj[filepath]!;
                routeLoaders[locale] = () => Promise.resolve(obj[filepath]!);
            });
        },
        async init(locale: string) {
            await this.loadRoutes(locale);

            _routes = routeCatalog[locale]!;

            _currentLocale = locale;

            return this;
        },
        getRoutes() {
            return _routes;
        },
        getRouteByPath(path: string) {
            return routeCatalog[_currentLocale]!.find((r) => r.path === path);
        },
        getRouteByIdentifer(id: string, locale?: string) {
            return routeCatalog[locale || _currentLocale]!.find((r) =>
                r.routingIdentifiers.includes(id),
            );
        },
        getBreadcrumb(path: string) {
            const currentRoute = routeCatalog[_currentLocale]!.find(
                (r) => r.path === path,
            );
            if (!currentRoute) return;
            return currentRoute.breadcrumb.map((id) => {
                const _route = routeCatalog[_currentLocale]!.find(
                    (r) => r.id === id,
                );
                return { title: _route?.title, url: _route?.path };
            });
        },
        async loadRoutes(locale: string) {
            if (!Object.hasOwn(routeLoaders, locale)) {
                throw new Error(
                    `Failed to init with locale "${locale}" because no message loader registered for it.`,
                );
            }

            if (currentLoadingRoutes.includes(locale)) {
                console.warn(
                    `The routes for "${locale}" is currently being loaded.`,
                );
                return this;
            }
            currentLoadingRoutes.push(locale);

            if (!Object.hasOwn(routeCatalog, locale)) {
                const content = await routeLoaders[locale]!();
                // @ts-ignore
                routeCatalog[locale] = content.default || content;
            }

            currentLoadingRoutes.splice(
                currentLoadingRoutes.indexOf(locale),
                1,
            );

            return this;
        },
        getCorrespondingRoute(path: string, locale: string) {
            const _route = routeCatalog[_currentLocale]!.find(
                (r) => r.path === path,
            );
            if (!_route) return;
            return routeCatalog[locale]!.find((r) => r.id === _route.id)?.path;
        },
    };

    function extractLocaleFromFilePath(filepath: string) {
        const pattern = /(?=(\/|.|-|_))[a-z]{2}(-|_)[A-Z]{2}(?=(\/|.|-|_))/;
        const match = filepath.match(pattern);
        return match ? match[0] : null;
    }

    return api;
})();

export type DirectusCmsRouteLoader = () => Promise<
    DirectusCmsRoute[] | { default: DirectusCmsRoute[] }
>;
export type DirectusCmsRouteLoaders = Record<string, DirectusCmsRouteLoader>;

export interface DirectusCmsRoute {
    id: number;
    published: boolean;
    sort: number | null;
    serd: string[];
    canonicalUrl?: string;
    component: string;
    parent: number | null;
    path: string;
    breadcrumb: number[];
    title: string;
    excerpt: string;
    slug: string;
    cover: DirectusFieldImage;
    components: DirectusCmsComponent[];
    localVersions: { locale: string; url: string }[];
    routingIdentifiers: string[];
}

export type DirectusCmsComponent =
    | DirectusCmsComponentLink
    | DirectusCmsComponentSingleText
    | DirectusCmsPhotoGallery;

export interface DirectusCmsComponentSingleText {
    _component: "SingleText";
    status: string;
}

export interface DirectusCmsComponentLink {
    _component: "Link";
    status: string;
    url: string;
    title: string;
    description: string;
    image: DirectusFieldImage;
    [index: string]: unknown;
}

export interface DirectusCmsPhotoGallery {
    _component: "PhotoGallery";
    status: string;
    photos: DirectusFieldImage[];
}

export interface DirectusFieldImage {
    title: string;
    description?: string;
    tags?: string[];
    presets: Record<string, DirectusFieldImagePreset>;
}

export interface DirectusFieldImagePreset {
    path: string;
    w: number;
    h: number;
    s: number;
    ar: number;
}

export interface DirectusFieldFile {}

export interface DirectusCmsSettings {
    maintenance_mode: boolean;
    search_engine_indexing: boolean;
    [index: string]: unknown;
}

export interface DirectusLanguage {
    status: string;
    sort: number | null;
    code: string;
    name: string;
    is_default: boolean;
    direction: string;
    [index: string]: unknown;
}

export interface DirectusBusiness {
    kind: string;
    name: string;
    address: string;
    address_coordinates: DirectusFieldCoordinates;
    phone_num: string;
    email: string;
    working_hours: DirectusFieldWorkingHours[];
    timezone: DirectusFieldTimezone;
    social_media_profiles: DirectusFieldSocialMediaProfile[];
    [index: string]: unknown;
}

export interface DirectusFieldCoordinates {
    coordinates: number[];
    type: string;
}

export interface DirectusFieldWorkingHours {
    day: string;
    opens_at: string;
    closes_at: string;
}

export interface DirectusFieldTimezone {
    id: number;
    status: string;
    name: string;
    offset: number;
    country: string;
}

export interface DirectusFieldSocialMediaProfile {
    id: string;
    title: string;
    url: string;
}
