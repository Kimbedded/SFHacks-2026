// Placeholder photos (Wikimedia Commons, bundled in public/facilities) for elevators and facility types.
const ELEVATOR_PHOTOS = ['/facilities/elevator-1.jpg', '/facilities/elevator-2.jpg'];

const FACILITY_PHOTOS: Record<string, string> = {
  elevator: '/facilities/elevator-1.jpg',
  power_door: '/facilities/door.jpg',
  ramp: '/facilities/ramp.jpg',
  accessible_restroom: '/facilities/restroom.jpg',
  lift: '/facilities/lift.jpg',
  braille_beacon: '/facilities/braille.jpg',
};

export function getElevatorPhoto(index: number): string {
  return ELEVATOR_PHOTOS[index % ELEVATOR_PHOTOS.length];
}

export function getFacilityPhoto(facilityType: string): string | undefined {
  return FACILITY_PHOTOS[facilityType];
}
