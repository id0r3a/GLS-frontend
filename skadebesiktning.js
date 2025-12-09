const backendUrl = "https://carworkshop-apii-gefhdxhugbhvb6cs.westeurope-01.azurewebsites.net/api";

const form = document.getElementById("damageInspectionForm");
const timeSelect = document.getElementById("damageTime");
const dateInput = form.querySelector('input[name="bookingDate"]');
const responseBox = document.getElementById("damageResponse");

// ===== Min-datum idag & (valfritt) sätt default till idag =====
(function setMinDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  dateInput.setAttribute("min", todayStr);
  if (!dateInput.value) dateInput.value = todayStr; // sätt dagens datum om tomt
})();

// ===== Generera tider: kvartsteg, sista 15 min innan stängning =====
// Returnerar "HH:mm"
function generateTimes(startHour, endHour) {
  const mins = [0, 15, 30, 45];
  const out = [];
  const lastMinute = endHour * 60;   // t.ex. 18:00 -> 1080
  const lastSlot   = lastMinute - 15; // t.ex. 17:45 -> 1065

  for (let h = startHour; h <= endHour; h++) {
    for (const m of mins) {
      const total = h * 60 + m;
      if (total > lastSlot) continue; // hoppa över senare än sista kvart
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

// ===== Uppdatera tider för valt datum (filtrera bort bokade + passerade idag) =====
async function updateTimes() {
  const val = dateInput.value;
  if (!val) return;

  const selectedDate = new Date(val + "T00:00:00");
  if (isNaN(selectedDate)) return;

  const day = selectedDate.getDay();
  const isWeekend = (day === 0 || day === 6);
  const startHour = 9;  // Samma varje dag
  const endHour   = 20; // Öppet till 20:00 varje dag

  const now = new Date();
  const isToday =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate();

  // Runda upp nu till nästa kvart
  const nowRoundedToNextQuarter = (() => {
    const mins = now.getHours() * 60 + now.getMinutes();
    return Math.ceil(mins / 15) * 15;
  })();

  // 1) skapa alla möjliga tider ("HH:mm")
  const allTimes = generateTimes(startHour, endHour);

  // 2) hämta bokade tider från API
  //    (Booking/booked-times tar hänsyn till både vanliga bokningar och skadebesiktningar)
  let booked = [];
  try {
    const res = await fetch(`${backendUrl}/booking/booked-times?date=${val}`);
    if (res.ok) {
      booked = await res.json(); // kan vara "HH:mm:ss" eller "HH:mm" beroende på din backend
    }
  } catch (e) {
    console.warn("Kunde inte hämta bokade tider:", e);
  }
  // Normalisera till "HH:mm" för jämförelse
  const bookedHHmm = booked.map(s => String(s).slice(0, 5));

  // 3) rendera listan
  timeSelect.innerHTML = '<option value="">Välj tid</option>';

  allTimes.forEach(t => {
    const [h, m] = t.split(":").map(Number);
    const total = h * 60 + m;

    // hoppa över passerade tider idag
    if (isToday && total < nowRoundedToNextQuarter) return;

    // hoppa över om tiden redan är bokad
    if (bookedHHmm.includes(t)) return;

    const opt = document.createElement("option");
    opt.value = `${t}:00`; // backend vill ha HH:mm:ss
    opt.textContent = t;   // visa HH:mm i UI
    timeSelect.appendChild(opt);
  });
}

// Kör när sidan laddas och när datum ändras
updateTimes();
dateInput.addEventListener("change", updateTimes);

// ===== Skicka formulär =====
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  let timeValue = form.bookingTime.value; // bör redan vara "HH:mm:ss"
  if (timeValue && timeValue.length === 5) {
    timeValue += ":00";
  }

  const data = {
    customerName: form.customerName.value,
    email: form.email.value,
    Phone: form.phone.value,
    registrationNumber: form.registrationNumber.value,
    bookingDate: form.bookingDate.value,
    bookingTime: timeValue
  };

  try {
    const res = await fetch(`${backendUrl}/damageinspection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json().catch(() => ({}));

    if (res.ok) {
      responseBox.textContent = result.message || "Skadebesiktning bokad!";
      responseBox.className = "success";
      form.reset();
      // fyll tider igen (för valt datum – fältet har kvar dagens datum)
      updateTimes();
    } else {
      responseBox.textContent = result.message || "Något gick fel.";
      responseBox.className = "error";
    }
  } catch (err) {
    responseBox.textContent = "Kunde inte kontakta servern.";
    responseBox.className = "error";
    console.error(err);
  }
});
