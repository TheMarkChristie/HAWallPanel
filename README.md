# Wall Panel

A full-screen dashboard for a wall tablet, built in React on
[ha-component-kit](https://github.com/shannonhochkins/ha-component-kit) and served by Home Assistant itself. Install
it through HACS, add the integration, and a **Wall Panel** entry appears in the sidebar. The tablet can also open the
page on its own, full screen, with no Home Assistant header or sidebar.

## What it shows

Tabs across the top: one for each **floor** of the house (highest first), then **Tasks** and **Security**.

- **A floor**: a tile for each room on that floor. Each tile shows the room's temperature and humidity, its icon, and
  round buttons for its lights and switches (a tap toggles). Tapping the room opens every device in it. Beside the
  rooms: the weather, the floor's heating, and any low batteries on that floor. Under them, **Also here**: anything a
  `Wall: <floor>` label put on this floor that has no room (a scene, a script, a Cast player).
- **Tasks**: everyone's chores for today and the household's lists, from the
  [Family Board](https://github.com/TheMarkChristie/HAFamilyBoard) integration. Tick a chore or an item, or add an
  item, and it goes straight into Microsoft To Do.
- **Security**: the house's locks, doors and windows, alarm, smoke, gas and leak sensors, motion and cameras, with one
  line saying whether everything is locked, shut and safe (smoke, a leak or an alarm going off counts). Unlocking asks
  first; locking happens at once.

The header carries the clock, the date, the weather (this house's: one labelled `Wall: Weather`, else the home
forecast) and who is home. The wall speaks English or Norwegian after the user's language in Home Assistant.

**Home tab on this screen.** The house button beside the tabs makes the current tab this screen's home tab (kept in
the browser), or open the page with `?home=<tab>` (`?home=lower_floor`, `?home=tasks`). On the wall tablet (the page
opened on its own) the screen stays awake, and two minutes after the last touch the wall goes back to its home tab
and closes any open room. Inside Home Assistant's sidebar on a phone or a PC it does neither.

A tap that Home Assistant refuses says so in a short note, and a ticked chore or an added item is put back. When the
connection is lost, a banner says the wall is reconnecting and the controls are dimmed; a wall that cannot reach Home
Assistant at all tries again every half minute (it never shows a sign-out link). After an update, a wall on 0.2.0 or
later loads the new version by itself once Home Assistant has restarted.

## Where each device lives

Every device has one **home tab**, worked out in this order:

1. A label on the device named **"Wall: &lt;tab&gt;"** puts it there: `Wall: Lower floor`, `Wall: Security`,
   `Wall: Tasks`. **`Wall: Hidden`** keeps it off the wall.
2. A device with **no room in this house** is not shown. This keeps another house's devices off the wall when a
   cloud account is shared between two homes, for example a Yale account with both houses' locks.
3. **Locks, alarm panels, cameras** and door, window, motion or smoke sensors go to **Security**.
4. Everything else goes to the **floor of its room**.

A TV's tile is its **Google Cast** player: the Android TV Remote and Android Debug Bridge players are other ways into the
same box and are not shown unless a `Wall: <tab>` label asks for them. A device with more than one thing to work (a
two-gang switch, a fan with a light) gets a tile for each.

An admin sees **Edit** in the header. It lists every device, where it is now and why, with a choice of home tab. A
choice writes the label on the device in Home Assistant, creating the label the first time. The same setting can be
changed on the device's own page in Home Assistant.

Settings and diagnostic entities, hidden entities and disabled devices are never shown. A room's temperature comes from
its thermostat or from a plain sensor reading between −5 and 40 °C, never from an appliance's probe; a thermometer's
own settings (a calibration number, a Hue motion sensor's switches) do not stop it counting.

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
python scripts/build.py      # rule tests, bundled icons, type check, build, copy into custom_components/wall_panel/www
python scripts/preview.py    # run it locally against a live Home Assistant and screenshot every tab
```

`build.py` refuses to copy a build that contains the long-lived token or a fixed Home Assistant address, and stops if
`app/package.json` and the integration's manifest disagree on the version. The page always uses the address it is
served from. Only English and Norwegian copies of Home Assistant's interface text are kept; any other language falls
back to English in the kit's own labels. The icons the wall and the kit's cards draw are bundled (`app/scripts/icons.mjs`),
so none comes from api.iconify.design; the kit's map and calendar cards' libraries (leaflet, autolinker) are left out,
and every file over 10 kB has a gzip copy that Home Assistant sends to browsers that take it. The page itself is never
cached; its scripts, named by their content, are kept for a month.

## Licence

MIT.
