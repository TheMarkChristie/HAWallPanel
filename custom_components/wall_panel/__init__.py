"""Wall Panel: a full-screen wall-tablet dashboard for Home Assistant, built in React on ha-component-kit, served by
Home Assistant itself and added to the sidebar. Tabs come from the house's floors plus Tasks and Security; a device's
tab follows its room's floor unless a "Wall: ..." label on the device says otherwise."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import CONF_TITLE, DEFAULT_TITLE, DOMAIN, PANEL_PATH, URL_BASE

_STATIC_REGISTERED = f"{DOMAIN}_static_registered"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the built dashboard; once per run (static paths cannot be removed again)."""
    if not hass.data.get(_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(Path(__file__).parent / "www"), cache_headers=False)])
        hass.data[_STATIC_REGISTERED] = True
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """The sidebar entry. The page address carries the version, so the browser and Home Assistant's own offline cache
    fetch a new page after every update instead of serving the last one."""
    integration = await async_get_integration(hass, DOMAIN)
    title = str(entry.options.get(CONF_TITLE) or entry.data.get(CONF_TITLE) or DEFAULT_TITLE)
    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title=title,
        sidebar_icon="mdi:tablet-dashboard",
        frontend_url_path=PANEL_PATH,
        config={"url": f"{URL_BASE}/index.html?v={integration.version}"},
        require_admin=False,
        update=True,
    )
    entry.async_on_unload(entry.add_update_listener(_async_options_changed))
    return True


async def _async_options_changed(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_PATH)
    return True
