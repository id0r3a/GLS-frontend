
const backendUrl = "http://localhost:5228/api";

// ===== Kontaktformulär =====
document.querySelector('#contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  const data = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    subject: form.subject.value,
    message: form.message.value
  };

  const res = await fetch(`${backendUrl}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const msg = await res.json();
  alert(msg.message);
});

// ===== Bokningsformulär med tagg-hantering =====
const dropdownToggle = document.getElementById("dropdownToggle");
const dropdownWrapper = dropdownToggle?.closest(".dropdown-wrapper");
const dropdownMenu = document.getElementById("dropdownMenu");
const selectedContainer = document.getElementById("selectedServicesContainer");
const hiddenInput = document.getElementById("selectedServices");
const bookingForm = document.getElementById("bookingForm");
const bookingDateInput = document.querySelector('input[name="bookingDate"]');
const bookingTimeSelect = document.getElementById("bookingTime");

let selectedServices = [];

// Visa/Göm dropdown
dropdownToggle?.addEventListener("click", () => {
  dropdownWrapper?.classList.toggle("open");
});

// Välj tjänst
dropdownMenu?.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    const service = e.target.getAttribute("data-value");
    if (!service || selectedServices.includes(service)) return;

    selectedServices.push(service);
    renderTags();
    dropdownWrapper?.classList.remove("open");
  }
});

// Rendera taggar
function renderTags() {
  selectedContainer.innerHTML = "";
  selectedServices.forEach(service => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `
      ${service}
      <button class="remove-tag" data-service="${service}">&times;</button>
    `;
    selectedContainer.appendChild(tag);
  });
  hiddenInput.value = selectedServices.join(",");
}

// Ta bort tagg
selectedContainer?.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-tag")) {
    const serviceToRemove = e.target.dataset.service;
    selectedServices = selectedServices.filter(s => s !== serviceToRemove);
    renderTags();
  }
});

// Klick utanför dropdown
document.addEventListener("click", (e) => {
  if (dropdownWrapper && !dropdownWrapper.contains(e.target)) {
    dropdownWrapper.classList.remove("open");
  }
});

// ===== Dynamisk tidsgenerering baserat på öppettider =====
function generateTimeOptions(startHour, endHour) {
  const allowedMinutes = [0, 15, 30, 45];
  const options = [];

  for (let h = startHour; h <= endHour; h++) {
    for (let m of allowedMinutes) {
      const hour = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      options.push(`${hour}:${min}`);
    }
  }

  return options;
}

function updateTimeSelect() {
  const selectedDate = new Date(bookingDateInput.value);
  if (isNaN(selectedDate)) return;

  const day = selectedDate.getDay(); // 0 = Söndag, 6 = Lördag
  const isWeekend = (day === 0 || day === 6);

  const startHour = isWeekend ? 10 : 9;
  const endHour = isWeekend ? 16 : 18;

  const times = generateTimeOptions(startHour, endHour - 1); // Slutar 16:45 eller 18:45
  bookingTimeSelect.innerHTML = `<option value="">Välj tid</option>`;
  times.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t + ":00"; // matchar backend-format (hh:mm:ss)
    opt.textContent = t;
    bookingTimeSelect.appendChild(opt);
  });
}

bookingDateInput?.addEventListener("change", updateTimeSelect);

// Anropa direkt om datum redan är valt
if (bookingDateInput.value) {
  updateTimeSelect();
}

// ===== Skicka bokning =====
bookingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;

  const data = {
    customerName: form.customerName.value,
    email: form.email.value,
    registrationNumber: form.registrationNumber.value,
    carModel: form.carModel?.value || "",
    serviceType: selectedServices,
    bookingDate: form.bookingDate.value,
    bookingTime: form.bookingTime.value
  };

  // Validera tid är inom öppettider
  const selectedDate = new Date(data.bookingDate);
  const [hour, minute] = data.bookingTime.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  const day = selectedDate.getDay();
  const min = (day === 0 || day === 6) ? 600 : 540;
  const max = (day === 0 || day === 6) ? 960 : 1080;

  if (totalMinutes < min || totalMinutes > max) {
    alert("Vald tid är utanför verkstadens öppettider.");
    return;
  }

  const res = await fetch(`${backendUrl}/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    alert("Bokningen har skickats!");
    form.reset();
    selectedServices = [];
    renderTags();
    bookingTimeSelect.innerHTML = `<option value="">Välj tid</option>`;
  } else {
    alert("Fel vid bokning.");
  }
});
