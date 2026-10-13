# Wall Panel

A full-screen dashboard for a wall tablet, built in React on
[ha-component-kit](https://github.com/shannonhochkins/ha-component-kit) and served by Home Assistant itself. Install
it through HACS, add the integration, and a **Wall Panel** entry appears in the sidebar. The tablet can also open the
page on its own, full screen, with no Home Assistant header or sidebar.

## What it shows

Tabs across the top: one for each **floor** of the house (highest first), then **Tasks** and **Security**.

- **A floor**: a tile for each room on that floor. Each tile shows the room's temperature and humidity, its icon, and
  round buttons for its lights and switches (a tap toggles). Tapping the room opens every device in it. Beside the
  rooms: the weather, the floor's heating, and any low batteries on that floor.
- **Tasks**: everyone's chores for today and the household's lists, from the
  [Family Board](https://github.com/TheMarkChristie/HAFamilyBoard) integration. Tick a chore or an item, or add an
  item, and it goes straight into Microsoft To Do.
- **Security**: the house's locks, doors and windows, alarm and cameras, with one line saying whether everything is
  locked and shut. Unlocking asks first; locking happens at once.

The header carries the clock, the date, the weather and who is home. On a tablet the page keeps the screen awake, and
it goes back to the first tab after two minutes without a touch.

## Where each device lives

Every device has one **home tab**, worked out in this order:

1. A label on the device named **"Wall: &lt;tab&gt;"** puts it there: `Wall: Lower floor`, `Wall: Security`,
   `Wall: Tasks`. **`Wall: Hidden`** keeps it off the wall.
2. A device with **no room in this house** is not shown. This keeps another house's devices off the wall when a
   cloud account is shared between two homes, for example a Yale account with both houses' locks.
3. **Locks, alarm panels, cameras** and door, window, motion or smoke sensors go to **Security**.
4. Everything else goes to the **floor of its room**.

An admin sees **Edit** in the header. It lists every device, where it is now and why, with a choice of home tab. A
choice writes the label on the device in Home Assistant, creating the label the first time. The same setting can be
changed on the device's own page in Home Assistant.

Settings and diagnostic entities, hidden entities and disabled devices are never shown. A room's temperature comes from
its thermostat or from a plain sensor reading between −5 and 40 °C, never from an appliance's probe.

## Install

1. HACS, Integrations, the three dots, **Custom repositories**: add `https://github.com/TheMarkChristie/HAWallPanel`
   as an **Integration**.
2. Install **Wall Panel** and restart Home Assistant.
3. Settings, Devices & services, **Add integration**, Wall Panel. The only setting is the sidebar title.

For the wall tablet, open `https://<your Home Assistant>/wall_panel/index.html` in the tablet's browser or a kiosk
browser, and sign in once. It uses the same sign-in as Home Assistant on that browser.

## Build from source

The page lives in `app/` (React, TypeScript, Vite, `@hakit/core` and `@hakit/components` 6.0.2).

```
cd app
npm install
cd ..
python scripts/build.py      # rule tests, type check, build, copy into custom_components/wall_panel/www
python scripts/preview.py    # run it locally against a live Home Assistant and screenshot every tab
```

`build.py` refuses to copy a build that contains the long-lived token or a fixed Home Assistant address. The page
always uses the address it is served from. Only English and Norwegian copies of Home Assistant's interface text are
kept; any other language falls back to English in the kit's own labels.

## Licence

MIT.
