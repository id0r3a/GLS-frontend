const backendUrl = "https://carworkshop-api.azurewebsites.net/api";

const form = document.getElementById("damageInspectionForm");
const timeSelect = document.getElementById("damageTime");
const dateInput = form.querySelector('input[name="bookingDate"]');
const responseBox = document.getElementById("damageResponse");

// Generera tider
function generateTimes(start = 9, end = 17) {
  const times = [];
  for (let h = start; h <= end; h++) {
    ["00", "15", "30", "45"].forEach(m => {
      times.push(`${h.toString().padStart(2, '0')}:${m}:00`);
    });
  }
  return times;
}

function updateTimes() {
  const times = generateTimes();
  timeSelect.innerHTML = '<option value="">Välj tid</option>';
  times.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t.slice(0, 5);
    timeSelect.appendChild(opt);
  });
}

updateTimes();

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  let timeValue = form.bookingTime.value;
  if (timeValue.length === 5) {
    timeValue += ":00"; // gör till hh:mm:ss
  }

  const data = {
    customerName: form.customerName.value,
    email: form.email.value,
    Phone: form.phone.value,
    registrationNumber: form.registrationNumber.value,
    bookingDate: form.bookingDate.value,
    bookingTime: timeValue
  };

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
  } else {
    responseBox.textContent = result.message || "Något gick fel.";
    responseBox.className = "error";
  }
});

