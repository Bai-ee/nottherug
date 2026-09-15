// Mounting shim. Four call sites import the booking form from this path:
// app/(marketing)/book, app/(marketing)/contact, and the home and services page
// content components. The implementation lives in components/booking/.
export { default } from './booking/BookingForm';
