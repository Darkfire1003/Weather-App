const apiKey = "55c91109b12f48ef8c564051261805";
const locationInput = document.getElementById("locationInput");
const locationOutput = document.getElementById("locationOutput");
const historyOutput = document.getElementById("history");
const topFiveOutput = document.getElementById("topFive");
const locationHistory = [];

let isLoading = false;

function fetchlocation() {
  const city = locationInput.value.trim();

  if (!city) {
    locationOutput.innerHTML = `
      <div class="p-4 rounded-2xl bg-red-100 text-red-500 font-bold text-center">
        Bitte eine Stadt eingeben
      </div>
    `;
    return;
  }

  if (isLoading) return;

  isLoading = true;

  locationOutput.innerHTML = `
    <div class="p-6 rounded-2xl bg-white text-center shadow-md">
      <p class="font-bold text-xl animate-pulse">
        Wetter wird geladen...
      </p>
    </div>
  `;

  fetch(
    `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=3&lang=de`,
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error.message);
      }

      const icon = "https:" + data.current.condition.icon;
      const day = data.forecast.forecastday[0].day;
      const current = data.current;

      const forecast = data.forecast.forecastday.map((item) => ({
        date: item.date,
        minTemp: item.day.mintemp_c,
        maxTemp: item.day.maxtemp_c,
        condition: item.day.condition.text,
        icon: "https:" + item.day.condition.icon,
        sunrise: item.astro.sunrise,
        sunset: item.astro.sunset,
        moonPhase: item.astro.moon_phase,
      }));

      const existingCity = locationHistory.find(
        (item) => item.name.toLowerCase() === data.location.name.toLowerCase(),
      );

      if (existingCity) {
        existingCity.searchCount += 1;
        existingCity.lastSearch = new Date().toLocaleString("de-DE");

        existingCity.temp = current.temp_c;
        existingCity.condition = current.condition.text;
        existingCity.img = icon;
        existingCity.windKph = current.wind_kph;
        existingCity.humidity = current.humidity;
        existingCity.feelsLike = current.feelslike_c;
        existingCity.forecast = forecast;
      }

      const locationWeather = {
        name: data.location.name,
        img: icon,
        imgAlt: current.condition.text,
        temp: current.temp_c,
        condition: current.condition.text,
        minTemp: day.mintemp_c,
        maxTemp: day.maxtemp_c,
        willRain: day.daily_will_it_rain ?? day.dailywillitrain ?? 0,
        chanceRain: day.daily_chance_of_rain ?? day.dailychanceofrain ?? 0,
        windKph: current.wind_kph,
        gustKph: current.gust_kph,
        humidity: current.humidity,
        feelsLike: current.feelslike_c,
        maxWindKph: day.maxwind_kph ?? day.maxwindkph ?? "-",
        forecast: forecast,
        searchCount: existingCity ? existingCity.searchCount : 1,
        lastSearch: new Date().toLocaleString("de-DE"),
      };

      if (!existingCity) {
        locationHistory.push(locationWeather);
      }

      saveWeatherToStrapi(locationWeather);

      renderCurrentWeather(existingCity || locationWeather);
      renderHistory();
      renderTopFive();

      localStorage.setItem("weatherHistory", JSON.stringify(locationHistory));

      locationInput.value = "";
    })
    .catch((err) => {
      console.error(err);

      locationOutput.innerHTML = `
        <div class="p-4 rounded-2xl bg-red-100 text-red-500 font-bold text-center">
          ${err.message}
        </div>
      `;
    })
    .finally(() => {
      isLoading = false;
    });
}

function renderCurrentWeather(loc) {
  locationOutput.innerHTML = `
    <label class="font-bold text-2xl mb-4 block">
      Dein Ergebnis
    </label>

    <div
      onclick="openCurrentModal('${loc.name}')"
      class="relative p-4 w-full flex flex-col justify-center items-center cursor-pointer rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.06),0_14px_24px_rgba(0,0,0,0.12)] bg-white hover:-translate-y-1 transition-all"
    >
      <h2 class="font-bold text-2xl">${loc.name}</h2>

      <img
        src="${loc.img}"
        alt="${loc.imgAlt}"
        class="w-24 h-24"
      />

      <p class="font-bold text-3xl">${loc.temp} °C</p>

      <p>${loc.condition}</p>

      <p class="text-sm text-gray-500">
        Wind: ${loc.windKph} km/h
      </p>

      <p class="text-sm text-gray-500">
        Luftfeuchtigkeit: ${loc.humidity}%
      </p>

      <p class="text-sm text-gray-500">
        Gefühlt: ${loc.feelsLike} °C
      </p>
    </div>
  `;
}

function renderHistory() {
  historyOutput.innerHTML = `
    <h2 class="font-bold text-xl mb-4">
      Suchverlauf
    </h2>

    <div class="flex flex-col lg:flex-row lg:flex-wrap gap-4 items-stretch">
      ${locationHistory
        .slice()
        .reverse()
        .map((loc, displayIndex) => {
          const realIndex = locationHistory.length - 1 - displayIndex;

          return `
            <div
              onclick="openModal(${displayIndex})"
              class="relative p-3 rounded-xl bg-white shadow-md cursor-pointer hover:-translate-y-1 transition-all"
            >
              <button
                type="button"
                onclick="event.stopPropagation(); deleteHistory(${realIndex})"
                class="absolute top-1 right-1 w-8 h-8 rounded-lg bg-white text-red-500 font-bold"
              >
                ×
              </button>

              <div class="flex items-center gap-3">
                <img
                  src="${loc.img}"
                  alt="${loc.imgAlt}"
                  class="w-12 h-12"
                />

                <div>
                  <p class="font-bold">${loc.name}</p>

                  <p class="text-sm text-gray-500">
                    ${loc.temp} °C
                  </p>

                  <p class="text-xs text-gray-400">
                    ${loc.lastSearch}
                  </p>

                  <p class="text-xs text-purple-500 font-bold">
                    ${loc.searchCount}x gesucht
                  </p>
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTopFive() {
  const topFive = locationHistory
    .slice()
    .sort((a, b) => b.searchCount - a.searchCount)
    .slice(0, 5);

  topFiveOutput.innerHTML = `
    <h2 class="font-bold text-xl mb-4">
      Top 5 Städte
    </h2>

    <div class="flex flex-col gap-3">
      ${topFive
        .map(
          (loc, index) => `
            <div
              class="p-3 rounded-xl bg-white shadow-md"
            >
              <div class="flex items-center gap-3">
                <span class="font-bold text-lg">
                  #${index + 1}
                </span>

                <img
                  src="${loc.img}"
                  alt="${loc.imgAlt}"
                  class="w-10 h-10"
                />

                <div>
                  <p class="font-bold">
                    ${loc.name}
                  </p>

                  <p class="text-sm text-gray-500">
                    ${loc.searchCount}x gesucht
                  </p>
                </div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function saveWeatherToStrapi(weather) {
  fetch("http://localhost:1338/api/wetters", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        city: weather.name,
        temperature: weather.temp,
        condition: weather.condition,
        icon: weather.img,
        minTemp: weather.minTemp,
        maxTemp: weather.maxTemp,
        chanceRain: weather.chanceRain,
        windKph: weather.windKph,
        humidity: weather.humidity,
        feelsLike: weather.feelsLike,
      },
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("In Strapi gespeichert:", data);
    })
    .catch((err) => {
      console.error("Fehler beim Speichern:", err);
    });
}

function openModal(index) {
  const reversedHistory = locationHistory.slice().reverse();
  const loc = reversedHistory[index];

  const modalContent = document.getElementById("modalContent");
  const weatherModal = document.getElementById("weatherModal");

  const rainText = Number(loc.willRain) === 1 ? "Ja" : "Nein";

  const forecastHtml = loc.forecast
    .map(
      (day) => `
        <div style="
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 10px 8px;
          text-align: center;
          color: white;
          min-width: 110px;
          flex-shrink: 0;
        ">
          <p style="font-size:0.72em; font-weight:700; margin-bottom:6px;">${day.date}</p>
          <img src="${day.icon}" alt="${day.condition}" width="36" height="36" style="margin:0 auto 6px;" />
          <p style="font-size:0.7em; color:rgb(220,220,220); min-height:32px;">${day.condition}</p>
          <p style="font-size:0.72em;"><strong>${day.maxTemp}°</strong> / ${day.minTemp}°</p>
        </div>
      `,
    )
    .join("");

  modalContent.innerHTML = `
    <div class="cardContainer">
      <div
  class="card overflow-y-auto px-7 py-4.5 max-h-[80vh]"
 
>
        <img src="${loc.img}" alt="${loc.imgAlt}" width="72" height="72" />
        <p class="city" style="font-size:1.1em;">${loc.name}</p>
        <p class="weather" style="font-size:0.85em;">${loc.condition}</p>
        <p class="temp" style="font-size:2.4em;">${loc.temp}°</p>

        <div class="minmaxContainer">
          <div class="min">
            <p class="minHeading">Min</p>
            <p class="minTemp">${loc.minTemp}°</p>
          </div>
          <div class="max">
            <p class="maxHeading">Max</p>
            <p class="maxTemp">${loc.maxTemp}°</p>
          </div>
        </div>

        <div style="width:100%; margin-top:16px; border-top:1px solid rgba(255,255,255,0.2); padding-top:14px; color:white; font-size:0.82em; line-height:1.6;">
          <p><strong>Regen heute:</strong> ${rainText}</p>
          <p><strong>Regenchance:</strong> ${loc.chanceRain}%</p>
          <p><strong>Wind:</strong> ${loc.windKph} km/h</p>
          <p><strong>Böen:</strong> ${loc.gustKph} km/h</p>
          <p><strong>Max. Wind:</strong> ${loc.maxWindKph} km/h</p>
          <p><strong>Luftfeuchtigkeit:</strong> ${loc.humidity}%</p>
          <p><strong>Gefühlte Temperatur:</strong> ${loc.feelsLike}°</p>
<div style="margin-top:16px;">
  <p class="text-white font-bold mb-2">
    Astronomische Daten
  </p>

  <p>
    🌅 Sonnenaufgang:
    ${loc.forecast[0].sunrise}
  </p>

  <p>
    🌇 Sonnenuntergang:
    ${loc.forecast[0].sunset}
  </p>

  <p>
    🌙 Mondphase:
    ${loc.forecast[0].moonPhase}
  </p>
</div>
          <div style="margin-top:16px;">
            <p class="text-white text-center font-bold mb-2.5">&larr; 3-Tage-Vorschau &rarr;</p>
            <div style="
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding-bottom:4px;
">
              ${forecastHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  weatherModal.classList.remove("hidden");
  weatherModal.classList.add("flex");
}

function openCurrentModal(cityName) {
  const reversedHistory = locationHistory.slice().reverse();

  const index = reversedHistory.findIndex((item) => item.name === cityName);

  if (index !== -1) {
    openModal(index);
  }
}

function closeModal() {
  const weatherModal = document.getElementById("weatherModal");
  weatherModal.classList.add("hidden");
  weatherModal.classList.remove("flex");
}
const savedHistory = localStorage.getItem("weatherHistory");

if (savedHistory) {
  locationHistory.push(...JSON.parse(savedHistory));

  renderHistory();
  renderTopFive();
}
function deleteHistory(index) {
  locationHistory.splice(index, 1);

  localStorage.setItem("weatherHistory", JSON.stringify(locationHistory));

  renderHistory();
  renderTopFive();

  if (locationHistory.length === 0) {
    locationOutput.innerHTML = "";
  }
}
