const backendUrl = "carworkshop-apii-gefhdxhugbhvb6cs.westeurope-01.azurewebsites.net/api";

/* =========================
   Kontaktformulär
   ========================= */
document.querySelector("#contactForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const responseEl = document.getElementById("contactResponse");

  // Finns fil? Skicka som multipart, annars JSON
  const fileInput = form.querySelector('input[type="file"][name="attachment"]');
  const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;

  try {
    let res;

    if (hasFile) {
      const fd = new FormData(form); // tar med name, email, phone, subject, message, attachment
      res = await fetch(`${backendUrl}/contact`, { method: "POST", body: fd });
    } else {
      const data = {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        subject: form.subject.value,
        message: form.message.value,
      };
      res = await fetch(`${backendUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    let msg = {};
    try { msg = await res.json(); } catch {}

    if (res.ok) {
      responseEl && (responseEl.textContent = msg.message || "Tack! Vi kontaktar dig snart.");
      responseEl && (responseEl.className = "success");
      form.reset();
    } else {
      responseEl && (responseEl.textContent = msg.message || `Ett fel uppstod (${res.status}).`);
      responseEl && (responseEl.className = "error");
    }
  } catch (err) {
    responseEl && (responseEl.textContent = "Kunde inte kontakta servern.");
    responseEl && (responseEl.className = "error");
    console.error(err);
  }
});


/* =========================
   Bokningsformulär + tjänst-taggar
   ========================= */
const dropdownToggle = document.getElementById("dropdownToggle");
const dropdownWrapper = dropdownToggle?.closest(".dropdown-wrapper");
const dropdownMenu = document.getElementById("dropdownMenu");
const selectedContainer = document.getElementById("selectedServicesContainer");
const hiddenInput = document.getElementById("selectedServices");
const bookingForm = document.getElementById("bookingForm");
const bookingDateInput = document.querySelector('input[name="bookingDate"]');
const bookingTimeSelect = document.getElementById("bookingTime");

let selectedServices = [];

// Om dropdownen är tom, fyll den med standardtjänster
const defaultServices = [
  "Lack/Plåtskador",
  "Polering",
  "Foliering",
  "Paintless Dent Repair",
  "Mekaniska reparationer",
  "Laga/byta vindruta",
  "Glasfiber",
];

if (dropdownMenu && dropdownMenu.children.length === 0) {
  dropdownMenu.innerHTML = defaultServices
    .map((s) => `<li data-value="${s}">${s}</li>`)
    .join("");
}

// Visa/Göm
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

// Rendera valda
function renderTags() {
  if (!selectedContainer) return;
  selectedContainer.innerHTML = "";
  selectedServices.forEach((service) => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `${service} <button class="remove-tag" data-service="${service}">&times;</button>`;
    selectedContainer.appendChild(tag);
  });
  if (hiddenInput) hiddenInput.value = selectedServices.join(",");
}

// Ta bort tagg
selectedContainer?.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-tag")) {
    const serviceToRemove = e.target.dataset.service;
    selectedServices = selectedServices.filter((s) => s !== serviceToRemove);
    renderTags();
  }
});

// Klick utanför dropdown
document.addEventListener("click", (e) => {
  if (dropdownWrapper && !dropdownWrapper.contains(e.target)) {
    dropdownWrapper.classList.remove("open");
  }
});


/* =========================
   Dynamiska tider (kvartsteg)
   ========================= */
function generateTimeOptions(startHour, endHour) {
  const allowedMinutes = [0, 15, 30, 45];
  const options = [];
  for (let h = startHour; h <= endHour; h++) {
    for (const m of allowedMinutes) {
      const hour = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      options.push(`${hour}:${min}`); // UI-text
    }
  }
  return options;
}

function updateTimeSelect() {
  if (!bookingTimeSelect || !bookingDateInput) return;
  const selectedDate = new Date(bookingDateInput.value);
  if (isNaN(selectedDate)) return;

  const day = selectedDate.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;

  const startHour = isWeekend ? 10 : 9;
  const endHour = isWeekend ? 16 : 18; // slut 16:45 / 18:45

  const times = generateTimeOptions(startHour, endHour);
  bookingTimeSelect.innerHTML = `<option value="">Välj tid</option>`;
  times.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = `${t}:00`;       // backend: HH:mm:ss
    opt.textContent = t;         // UI: HH:mm
    bookingTimeSelect.appendChild(opt);
  });
}

// Kör direkt och när datum ändras
bookingDateInput?.addEventListener("change", updateTimeSelect);
if (bookingDateInput?.value) updateTimeSelect();


/* =========================
   Skicka bokning
   ========================= */
bookingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  const data = {
    customerName: form.customerName.value,
    email: form.email.value,
    phone: form.phone?.value || "",                // lägg med om API:et vill ha det
    registrationNumber: form.registrationNumber.value,
    serviceType: selectedServices,
    bookingDate: form.bookingDate.value,           // YYYY-MM-DD
    bookingTime: form.bookingTime.value,           // HH:mm:ss
  };

  // Validera öppettider (inkl. :45)
  const selectedDate = new Date(data.bookingDate);
  const [hh = "0", mm = "0"] = (data.bookingTime || "0:0").split(":");
  const total = (+hh) * 60 + (+mm);
  const day = selectedDate.getDay();
  const startHour = (day === 0 || day === 6) ? 10 : 9;
  const endHour = (day === 0 || day === 6) ? 16 : 18;
  const minMinutes = startHour * 60;             // 10:00 / 09:00
  const maxMinutes = endHour * 60 + 45;          // 16:45 / 18:45

  if (total < minMinutes || total > maxMinutes) {
    alert("Vald tid är utanför verkstadens öppettider.");
    return;
  }

  try {
    const res = await fetch(`${backendUrl}/Booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    let payload = {};
    try { payload = await res.json(); } catch {}

    if (res.ok) {
      alert(payload.message || "Bokningen har skickats!");
      form.reset();
      selectedServices = [];
      renderTags();
      bookingTimeSelect && (bookingTimeSelect.innerHTML = `<option value="">Välj tid</option>`);
    } else {
      alert(payload.message || `Fel vid bokning (${res.status}).`);
    }
  } catch (err) {
    console.error(err);
    alert("Kunde inte kontakta servern.");
  }
});
