import { getMovie, createReview, deleteReview, setReaction, ApiError } from "./api.js";
import { getToken, getUser } from "./auth.js";
import {
  $, clearAlert, errorText, escapeHtml, formatDate, formatRating,
  setBusy, setYear, setupAuthLink, showAlert, showFieldErrors,
} from "./utils.js";

const movieId = new URLSearchParams(location.search).get("id");
const reviewForm = $("#review-form");
const reviewAlert = $("#review-alert");

function renderDetail(movie) {
  const rating = formatRating(movie.average_rating, movie.rating_count);
  const names = (items, key) => (items ?? []).map((item) => escapeHtml(item[key])).join(", ");
  const poster = movie.image_url
    ? `<img class="detail-poster" src="${escapeHtml(movie.image_url)}" alt="Póster de ${escapeHtml(movie.movie_name)}" />`
    : `<div class="detail-poster poster-placeholder">${escapeHtml(movie.movie_name)}</div>`;

  $("#detail-content").innerHTML = `
    <section class="detail-hero">
      <div>${poster}</div>
      <div class="detail-info">
        <p class="eyebrow">ARCHIVO CMDB</p>
        <h1>${escapeHtml(movie.movie_name)}</h1>
        <div class="detail-meta">
          <span class="detail-score">★ ${rating ?? "Sin calificar"}</span>
          <span>${escapeHtml(movie.release_year)}</span>
          ${movie.runtime ? `<span>${escapeHtml(movie.runtime)} min</span>` : ""}
          <span>${Number(movie.rating_count)} calificaciones</span>
        </div>
        <p class="detail-synopsis">${escapeHtml(movie.overview)}</p>
        <div class="detail-genres">
          ${(movie.categories ?? []).map((c) => `<span>${escapeHtml(c.category_name)}</span>`).join("")}
        </div>
        ${names(movie.directors, "director_name") ? `<p><strong>Dirección:</strong> ${names(movie.directors, "director_name")}</p>` : ""}
        ${names(movie.actors, "actor_name") ? `<p><strong>Reparto:</strong> ${names(movie.actors, "actor_name")}</p>` : ""}
      </div>
    </section>
  `;
  document.title = `${movie.movie_name} — CMDB`;
}

function reviewCard(review, me) {
  const own = Boolean(me) && Number(me.id) === Number(review.user_id);
  const canVote = Boolean(getToken()) && !own;
  return `
    <article class="review-card" data-review-id="${review.id}">
      <div class="review-card-head">
        <div>
          <span class="review-author">${escapeHtml(review.username)}</span>
          <span class="review-date"> · ${escapeHtml(formatDate(review.created_at))}</span>
        </div>
        <span class="review-stars">★ ${Number(review.rating)}/10</span>
      </div>
      <h4>${escapeHtml(review.title)}</h4>
      <p class="review-body">${escapeHtml(review.comment)}</p>
      <div class="review-actions">
        <button class="vote-button" data-action="like" ${canVote ? "" : "disabled"}>↑ ${Number(review.likes)}</button>
        <button class="vote-button" data-action="dislike" ${canVote ? "" : "disabled"}>↓ ${Number(review.dislikes)}</button>
        ${own ? '<button class="button button-danger" data-action="delete">Eliminar mi reseña</button>' : ""}
      </div>
    </article>`;
}

function renderReviews(reviews) {
  const me = getUser();
  $("#review-count").textContent = `${reviews.length} reseñas`;
  $("#review-list").innerHTML = reviews.length
    ? reviews.map((review) => reviewCard(review, me)).join("")
    : '<p class="loading-state">Aún no hay reseñas. Sé la primera persona en compartir su mirada.</p>';
}

// Fetches the movie (with its reviews) and renders both
async function loadMovie() {
  const movie = await getMovie(movieId);
  renderDetail(movie);
  renderReviews(movie.reviews ?? []);
}

async function init() {
  setYear();
  setupAuthLink();

  if (!movieId) {
    $("#detail-content").innerHTML = `<p class="loading-state">Falta el identificador de la película en la dirección.</p>`;
    reviewForm.classList.add("hidden");
    return;
  }

  if (!getToken()) {
    reviewForm.classList.add("hidden");
    $("#review-login").classList.remove("hidden");
  }

  try {
    await loadMovie();
  } catch (err) {
    $("#detail-content").innerHTML = `<p class="loading-state">${escapeHtml(errorText(err))}</p>`;
    reviewForm.classList.add("hidden");
  }

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(reviewAlert);
    showFieldErrors(reviewForm, []);

    const data = Object.fromEntries(new FormData(reviewForm));
    const button = reviewForm.querySelector('button[type="submit"]');
    setBusy(button, true);
    try {
      await createReview({
        movieId: Number(movieId),
        title: data.title.trim(),
        comment: data.comment.trim(),
        rating: Number(data.rating),
      });
      reviewForm.reset();
      showAlert(reviewAlert, "Reseña publicada.", "success");
      await loadMovie();
    } catch (err) {
      if (err instanceof ApiError) showFieldErrors(reviewForm, err.errors);
      showAlert(reviewAlert, errorText(err));
    } finally {
      setBusy(button, false);
    }
  });

  // Review actions: like/dislike on other people's reviews, delete your own
  $("#review-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const reviewId = button.closest("[data-review-id]").dataset.reviewId;
    clearAlert(reviewAlert);
    setBusy(button, true);
    try {
      if (button.dataset.action === "delete") {
        if (!window.confirm("¿Eliminar tu reseña?")) return;
        await deleteReview(reviewId);
      } else {
        await setReaction(reviewId, button.dataset.action);
      }
      await loadMovie();
    } catch (err) {
      showAlert(reviewAlert, errorText(err));
    } finally {
      setBusy(button, false);
    }
  });
}

init();
