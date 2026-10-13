"""Wall Panel set-up: one entry, with the sidebar title as its only setting."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import TextSelector

from .const import CONF_TITLE, DEFAULT_TITLE, DOMAIN, NAME


class WallPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title=NAME, data={}, options={CONF_TITLE: user_input[CONF_TITLE]})
        return self.async_show_form(step_id="user", data_schema=vol.Schema({
            vol.Required(CONF_TITLE, default=DEFAULT_TITLE): TextSelector(),
        }))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return WallPanelOptionsFlow()


class WallPanelOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        current = self.config_entry.options.get(CONF_TITLE, DEFAULT_TITLE)
        return self.async_show_form(step_id="init", data_schema=vol.Schema({
            vol.Required(CONF_TITLE, default=current): TextSelector(),
        }))
