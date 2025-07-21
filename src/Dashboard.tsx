import { useAuth } from "./contexts/AuthProvider"
import MainAppBar from "./components/MainAppBar"
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
} from "@mui/material"
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"
import { divIcon } from "leaflet"
import "./leaflet.css"
import { useEffect, useState, useRef, SetStateAction, Dispatch } from "react"
import { getDevices } from "./api/index"
import {
  formatISODate,
  getGeolocation,
  sortDevices,
  stringToHexColor,
} from "./utils/utils"
import Symbol from "./components/Symbol"
import { useNavigate, useLocation, NavigateFunction } from "react-router-dom"
import "./Dashboard.css"
import { Device } from "./types/types"
import { Sort } from "./types/enums"
import { useQuery } from "@tanstack/react-query"
import GeolocationMarker from "./components/GeolocationMarker"
import Icon from "@mdi/react"
import { mdiChevronRight } from "@mdi/js"
import { mdiCrosshairs } from "@mdi/js"
import { mdiCrosshairsGps } from "@mdi/js"

interface DeviceListProps {
  devices: Device[]
  selectedDevice: Device | null
  setSelectedDevice: Dispatch<SetStateAction<Device | null>>
  navigate: NavigateFunction
}

interface DeviceCardProps {
  device: Device
  selectedDevice: Device | null
  setSelectedDevice: Dispatch<SetStateAction<Device | null>>
  navigate: NavigateFunction
}

interface MarkersProps {
  devices: Device[]
  setSelectedDevice: Dispatch<SetStateAction<Device | null>>
}

interface MapUpdaterProps {
  device: Device | null
  setMapMovedByUser: Dispatch<SetStateAction<boolean>>
}

interface MapEventHandlerProps {
  setSelectedDevice: Dispatch<SetStateAction<Device | null>>
  mapMovedByUser: boolean
  setMapMovedByUser: Dispatch<SetStateAction<boolean>>
}

function Dashboard() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { device_id } = location.state || {}

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [mapMovedByUser, setMapMovedByUser] = useState<boolean>(false)
  const firstLoad = useRef<boolean>(true)

  const { data: userGeolocation = null } = useQuery({
    queryKey: ["geolocation"],
    queryFn: () => getGeolocation(),
  })

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => {
      if (!auth) return []
      return getDevices()
    },
  })

  useEffect(() => {
    if (!devices || !firstLoad.current) return

    const sortedDevices = sortDevices(devices, Sort.LATEST_LOCATION)

    setSelectedDevice(
      device_id
        ? devices.find((device: Device) => device.id === device_id)
        : sortedDevices[0]
    )

    if (devices.length > 0) {
      firstLoad.current = false
    }
  }, [devices, device_id])

  return (
    <>
      <MainAppBar selectedNav={"dashboard"} />
      <Box
        sx={{
          padding: 2,
          height: "calc(100vh - 64px)",
        }}
      >
        <Box
          sx={{
            width: 1,
            height: 1,
            display: { xs: "block", md: "flex" },
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Paper
              sx={{
                overflowY: "auto",
                height: 1,
                padding: 2,
                marginBottom: { xs: 2, md: 0 },
                borderRadius: 4,
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: 24, md: 32 },
                  fontWeight: 600,
                  textAlign: { xs: "left", sm: "center", md: "left" },
                  mb: 2,
                }}
              >
                Devices
              </Typography>
              <DeviceList
                devices={devices}
                selectedDevice={selectedDevice}
                setSelectedDevice={setSelectedDevice}
                navigate={navigate}
              />
            </Paper>
          </Box>
          {devices ? (
            <Box sx={{ flex: 2, height: 1 }}>
              <MapContainer center={[0, 0]} zoom={4} scrollWheelZoom={true}>
                <MapUpdater
                  device={selectedDevice}
                  setMapMovedByUser={setMapMovedByUser}
                />
                <MapEventHandler
                  mapMovedByUser={mapMovedByUser}
                  setSelectedDevice={setSelectedDevice}
                  setMapMovedByUser={setMapMovedByUser}
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Markers
                  devices={devices}
                  setSelectedDevice={setSelectedDevice}
                />
                {userGeolocation?.coords ? (
                  <GeolocationMarker
                    geolocation={userGeolocation?.coords}
                    onClick={() => {
                      setSelectedDevice(null)
                    }}
                  />
                ) : (
                  ""
                )}
              </MapContainer>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Box>
    </>
  )
}

function DeviceList({
  devices,
  selectedDevice,
  setSelectedDevice,
  navigate,
}: DeviceListProps) {
  const sortedDevices = sortDevices(devices, Sort.LATEST_LOCATION)
  if (devices) {
    return sortedDevices.map((device) => {
      return (
        <DeviceCard
          key={device.id}
          device={device}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          navigate={navigate}
        />
      )
    })
  }
}

function DeviceCard({
  device,
  selectedDevice,
  setSelectedDevice,
  navigate,
}: DeviceCardProps) {
  return (
    <Card elevation={2} sx={{ mb: 2, borderRadius: 4 }}>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Symbol
            name={device.icon}
            color={stringToHexColor(device.name)}
            size={1.6}
          />
          <Box>
            <Typography
              variant="h5"
              component="div"
              sx={{ fontSize: { xs: 16, md: 24 } }}
            >
              {device.name}
            </Typography>
            {device.latest_location ? (
              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  color: "text.secondary",
                }}
              >
                Latest location:{" "}
                {device.latest_location.created_at
                  ? formatISODate(device.latest_location.created_at.toString())
                  : ""}
              </Typography>
            ) : (
              ""
            )}
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "row", sm: "column", xl: "row" },
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
          }}
        >
          {device.latest_location ? (
            <IconButton
              title="Locate device"
              onClick={() => {
                setSelectedDevice(device)
              }}
            >
              {selectedDevice && device.id === selectedDevice.id ? (
                <Icon path={mdiCrosshairsGps} size={1} />
              ) : (
                <Icon path={mdiCrosshairs} size={1} />
              )}
            </IconButton>
          ) : (
            ""
          )}
          <IconButton
            title="Go to details"
            onClick={() => {
              navigate(`/devices#${device.id}`, {
                state: { device_id: device.id },
              })
            }}
          >
            <Icon path={mdiChevronRight} size={1} />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  )
}

function Markers({ devices, setSelectedDevice }: MarkersProps) {
  if (devices) {
    return devices.map((device) => {
      if (device.latest_location) {
        // Add the timestamp if it exists
        const detailsTime = device.latest_location.created_at
          ? `<div class="dashboard-details-time">${formatISODate(
              device.latest_location.created_at.toString()
            )}</div>`
          : ""

        // HTML for the custom marker
        const icon = divIcon({
          html: `<div class="dashboard-pin" style="background-color: ${stringToHexColor(
            device.name
          )};"></div><div class="dashboard-pin-details"><div class="dashboard-details-name">${
            device.name
          }</div><div class="dashboard-details-coords">${
            device.latest_location.latitude
          }, ${device.latest_location.longitude}</div>${detailsTime}</div>`,
          className: "dashboard-device-div-icon",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })
        return (
          <Box key={device.latest_location.id}>
            <Marker
              icon={icon}
              position={[
                device.latest_location.latitude,
                device.latest_location.longitude,
              ]}
              eventHandlers={{
                click: () => {
                  setSelectedDevice(device)
                },
              }}
            />
            {device.latest_location.accuracy ? (
              <Circle
                center={[
                  device.latest_location.latitude,
                  device.latest_location.longitude,
                ]}
                pathOptions={{
                  fillColor: stringToHexColor(device.name),
                  color: stringToHexColor(device.name),
                }}
                radius={device.latest_location.accuracy}
              />
            ) : null}
          </Box>
        )
      } else {
        return null
      }
    })
  }
}

function MapUpdater({ device, setMapMovedByUser }: MapUpdaterProps) {
  const map = useMap()

  useEffect(() => {
    if (device && device.latest_location) {
      const { latitude, longitude } = device.latest_location
      setMapMovedByUser(false)
      map.setView([latitude, longitude], 18)
    }
  }, [device, map, setMapMovedByUser])

  return null
}

function MapEventHandler({
  setSelectedDevice,
  mapMovedByUser,
  setMapMovedByUser,
}: MapEventHandlerProps) {
  useMapEvents({
    dragend: () => {
      setSelectedDevice(null)
      setMapMovedByUser(true)
    },
    zoomend: () => {
      if (mapMovedByUser) {
        setSelectedDevice(null)
      }
      setMapMovedByUser(true)
    },
  })

  return null
}

export default Dashboard
