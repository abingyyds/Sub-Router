import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  createAppReview,
  createAppReviewReply,
  deleteAppReview,
  getAppReviews,
  getMyAppReview,
  updateAppReview,
} from '../api';

const PAGE_SIZE = 10;

function RatingStars({ value, onChange, disabled = false, size = 18 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = (
          <Star
            size={size}
            className={star <= value ? 'text-amber-500' : 'text-page-muted'}
            fill={star <= value ? 'currentColor' : 'none'}
          />
        );
        if (disabled) return <span key={star}>{icon}</span>;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label={`${star} / 5`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export default function AppReviewSection({ appId, user, onChanged }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [myReview, setMyReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAppReviews({
        app_id: appId,
        page,
        page_size: PAGE_SIZE,
      });
      if (response.data.success) {
        setReviews(response.data.data || []);
        setTotal(Number(response.data.total || 0));
      }
    } catch {
      // The shared API interceptor presents the request error.
    } finally {
      setLoading(false);
    }
  }, [appId, page]);

  const fetchMyReview = useCallback(async () => {
    if (!user) {
      setMyReview(null);
      return;
    }
    try {
      const response = await getMyAppReview(appId, { skipErrorHandler: true });
      const review = response.data.success ? response.data.data : null;
      setMyReview(review);
      setRating(review?.rating || 0);
      setContent(review?.content || '');
    } catch {
      setMyReview(null);
    }
  }, [appId, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchMyReview();
  }, [fetchMyReview]);

  const refreshAfterChange = async () => {
    await Promise.all([fetchReviews(), fetchMyReview()]);
    onChanged?.();
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error(t('appMarket.selectRating'));
      return;
    }
    setSubmitting(true);
    try {
      const response = myReview
        ? await updateAppReview(myReview.id, { rating, content })
        : await createAppReview({ app_id: appId, rating, content });
      if (response.data.success) {
        toast.success(response.data.message);
        await refreshAfterChange();
      }
    } catch {
      // The shared API interceptor presents the request error.
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    setSubmitting(true);
    try {
      const response = await deleteAppReview(myReview.id);
      if (response.data.success) {
        toast.success(response.data.message);
        setRating(0);
        setContent('');
        await refreshAfterChange();
      }
    } catch {
      // The shared API interceptor presents the request error.
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (reviewId) => {
    const trimmed = replyContent.trim();
    if (!trimmed) {
      toast.error(t('appMarket.replyRequired'));
      return;
    }
    setReplySubmitting(true);
    try {
      const response = await createAppReviewReply(reviewId, trimmed);
      if (response.data.success) {
        toast.success(response.data.message);
        setReplyContent('');
        setReplyingTo(null);
        await fetchReviews();
      }
    } catch {
      // The shared API interceptor presents the request error.
    } finally {
      setReplySubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="border-t border-page-divider bg-page-surface px-5 py-6 sm:px-7">
      <h3 className="mb-5 text-base font-semibold text-page">{t('appMarket.reviews', { count: total })}</h3>

      {user ? (
        <div className="mb-6 rounded-lg border border-page-divider bg-page-inset p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-page">
              {myReview ? t('appMarket.editReview') : t('appMarket.writeReview')}
            </span>
            <RatingStars value={rating} onChange={setRating} size={20} />
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={t('appMarket.reviewPlaceholder')}
            maxLength={500}
            rows={3}
            className="w-full resize-y rounded-lg border border-page-input bg-page-input px-3 py-2 text-sm text-page placeholder:text-page-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-page-muted">{content.length}/500</span>
            <div className="flex gap-2">
              {myReview && (
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 text-sm"
                  disabled={submitting}
                  onClick={handleDelete}
                >
                  {t('appMarket.delete')}
                </button>
              )}
              <button
                type="button"
                className="btn-primary inline-flex items-center px-4 py-2 text-sm"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('appMarket.submit')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-page-divider bg-page-inset p-4">
          <span className="text-sm text-page-secondary">{t('appMarket.writeReview')}</span>
          <Link to="/login" className="btn-primary px-4 py-2 text-sm">
            {t('appMarket.loginToReview')}
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-28 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-page-muted" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-page-secondary">{t('appMarket.noReviews')}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-page-divider bg-page-inset p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-page">{t('appMarket.anonymous')}</span>
                <RatingStars value={review.rating} disabled size={15} />
                <time className="text-xs text-page-muted">{new Date(review.created_time * 1000).toLocaleString()}</time>
              </div>
              {review.content && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-page">{review.content}</p>
              )}
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-page-link hover:underline"
                onClick={() => {
                  setReplyingTo(replyingTo === review.id ? null : review.id);
                  setReplyContent('');
                }}
              >
                {replyingTo === review.id ? t('appMarket.hideReply') : t('appMarket.reply')}
              </button>

              {review.replies?.length > 0 && (
                <div className="mt-3 space-y-2 border-l border-page-divider pl-3">
                  {review.replies.map((reply) => (
                    <div key={reply.id} className="bg-page-surface px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-page">{t('appMarket.anonymous')}</span>
                        <time className="text-page-muted">{new Date(reply.created_time * 1000).toLocaleString()}</time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-page">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === review.id && (
                <div className="mt-3">
                  {user ? (
                    <>
                      <textarea
                        value={replyContent}
                        onChange={(event) => setReplyContent(event.target.value)}
                        placeholder={t('appMarket.replyPlaceholder')}
                        maxLength={500}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-page-input bg-page-input px-3 py-2 text-sm text-page placeholder:text-page-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-4 py-2 text-sm"
                          disabled={replySubmitting}
                          onClick={() => setReplyingTo(null)}
                        >
                          {t('appMarket.cancel')}
                        </button>
                        <button
                          type="button"
                          className="btn-primary inline-flex items-center px-4 py-2 text-sm"
                          disabled={replySubmitting}
                          onClick={() => handleReply(review.id)}
                        >
                          {replySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('appMarket.submitReply')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <Link to="/login" className="btn-primary inline-flex px-4 py-2 text-sm">
                      {t('appMarket.loginToReview')}
                    </Link>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn-secondary flex h-9 w-9 items-center justify-center p-0"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            aria-label={t('appMarket.previousPage')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm tabular-nums text-page-secondary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary flex h-9 w-9 items-center justify-center p-0"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            aria-label={t('appMarket.nextPage')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
