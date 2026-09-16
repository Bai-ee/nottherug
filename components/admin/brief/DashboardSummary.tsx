'use client';

import { useMemo } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { WeatherBackground, extractWeatherDisplay, getWeatherKey } from './WeatherBackdrop';
import { formatCompactDate, formatDate, formatUsd } from './overview';
import type { LatestBriefResponse, OverviewRun } from './types';

/**
 * Everything above the "Previous Runs" rail: the weather hero, priority
 * action, cross-platform post preview, content angle, and the two signal
 * grids. Kept as one component because it is one continuous read of a
 * single `active` run — see DashboardHistory for the separate "pick a
 * different run" concern.
 */
export function DashboardSummary({
  active,
  latest,
  error,
  isHistorical,
  carouselIndex,
  setCarouselApi,
  onSelectSlide,
}: {
  active: OverviewRun | null;
  latest: LatestBriefResponse | null;
  error: string;
  isHistorical: boolean;
  carouselIndex: number;
  setCarouselApi: (api: CarouselApi) => void;
  onSelectSlide: (index: number) => void;
}) {
  const weatherKey = getWeatherKey(active?.weatherImpact);
  const weatherDisplay = extractWeatherDisplay(active?.weatherImpact);
  const instagramCopy = active?.content?.instagram_post_copy ?? null;
  const contentAngle = active?.content?.content_angle ?? active?.contentAngle ?? null;
  const stageCosts = active?.runCost?.stageCosts ?? [];

  const yelpSignals = useMemo(() => {
    const insights = active?.reviewInsights ?? [];
    const filtered = insights.filter((item) => /yelp/i.test(`${item.source} ${item.url}`));
    return filtered.length ? filtered : insights;
  }, [active]);
  const googleBusinessSignals = useMemo(
    () => (active?.reviewInsights ?? []).filter((item) => /google/i.test(`${item.source} ${item.url}`)),
    [active],
  );
  const instagramSignals = useMemo(
    () => (active?.brandMentions ?? []).filter((item) => /instagram/i.test(`${item.source} ${item.author} ${item.url}`)),
    [active],
  );

  return (
    <>
      <section className="db-hero" id="brief-hero-band">
        <WeatherBackground weatherKey={weatherKey} />
        <div className="db-hero-inner">
          <div className="db-hero-copy">
            <div className="db-kicker">DAILY BRIEF</div>
            <h1 className="db-heading">Not the Rug</h1>
            <div className="db-hero-meta">
              <span>{formatDate(active?.createdAt)}</span>
            </div>
            {error ? <div className="db-error">{error}</div> : null}
          </div>

          <aside className="db-hero-aside">
            <div className="db-stat-grid">
              <div className="db-stat-card">
                <div className="db-label">Weather Impact</div>
                <div className="db-stat-value">{weatherDisplay.headline}</div>
                <div className="db-stat-copy db-stat-meta">
                  <span>{weatherDisplay.lineOne}</span>
                  {weatherDisplay.lineTwo ? <span>{weatherDisplay.lineTwo}</span> : null}
                </div>
              </div>
              <div className="db-stat-card">
                <div className="db-label">Run Cost</div>
                <div className="db-stat-value">{formatUsd(active?.runCost?.totalEstimatedUsd)}</div>
                <div className="db-stat-copy">
                  <span>AI {formatUsd(active?.runCost?.aiEstimatedUsd)}</span>
                  <span>Storage {formatUsd(active?.runCost?.firebaseEstimatedUsd)}</span>
                </div>
              </div>
              <div id="db-leads-captured-card" className="db-stat-card">
                <div className="db-label">Leads Captured</div>
                <div className="db-stat-value">{latest?.leadStats?.today?.count ?? 0}</div>
                <div className="db-stat-copy">
                  <span>Today ({latest?.leadStats?.today?.dateLabel ?? '—'}) · Yesterday <strong>{latest?.leadStats?.yesterday?.count ?? 0}</strong></span>
                  <span>7d <strong>{latest?.leadStats?.totals?.last7Days ?? 0}</strong> · 30d <strong>{latest?.leadStats?.totals?.last30Days ?? 0}</strong> · Recent <strong>{latest?.leadStats?.totals?.recentCount ?? 0}</strong></span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="db-panel">
        <div className="db-panel-head">
          <h2 className="db-panel-title">Priority Action</h2>
          <span className="db-note">Immediate move for this run</span>
        </div>
        <div className="db-panel-body">
          <div className="db-info-card">
            <div className="db-label">Priority Action</div>
            <div className="db-value">{active?.scoutPriorityAction ?? 'No priority action saved for this run.'}</div>
          </div>
        </div>
      </section>

      <section className="db-panel">
        <div className="db-panel-head">
          <h2 className="db-panel-title">Post of the Day</h2>
          <span className="db-note">{isHistorical ? 'Historical package' : 'Latest package'}</span>
        </div>
        <div className="db-panel-body">

          <Carousel
            id="platform-post-carousel-shell"
            className="carousel-shell"
            opts={{ align: 'center', containScroll: false, breakpoints: { '(min-width: 1280px)': { active: false } } }}
            setApi={setCarouselApi}
          >
            <CarouselContent className="platform-track">

              <CarouselItem className="platform-slot">
                <div className="platform-label">Instagram</div>
                <div id="ig-post-card" className="ig-card">

                  <div className="ig-header">
                    <div className="ig-avatar">
                      <span className="ig-avatar-initials">NTR</span>
                    </div>
                    <div className="ig-header-info">
                      <div className="ig-username">not_the_rug</div>
                      <div className="ig-location">Brooklyn, NY</div>
                    </div>
                    <span className="ig-more">···</span>
                  </div>

                  <div className="ig-image">
                    {active?.generatedImage?.renderDownloadURL ? (
                      <img src={active.generatedImage.renderDownloadURL} alt="Not The Rug social post" />
                    ) : (
                      <div className="ig-image-ph">
                        <svg className="ig-image-ph-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#55624C" strokeWidth="1.4">
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <div className="ig-image-ph-text">Generated post image<br/>appears here</div>
                        <a className="ig-image-ph-cta" href="/admin/dashboard/photos">Open Photos →</a>
                      </div>
                    )}
                  </div>

                  <div className="ig-actions">
                    <div className="ig-act-left">
                      <button className="ig-icon-btn" aria-label="Like">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                      <button className="ig-icon-btn" aria-label="Comment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                      <button className="ig-icon-btn" aria-label="Share">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </div>
                    <button className="ig-icon-btn" aria-label="Save">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>

                  <div className="ig-caption">
                    <strong className="ig-caption-user">not_the_rug</strong>
                    {instagramCopy ?? 'No caption saved for this run.'}
                  </div>

                  <div className="ig-timestamp">
                    {active?.createdAt ? formatCompactDate(active.createdAt) : 'Just now'}
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="platform-slot">
                <div className="platform-label">X / Twitter</div>
                <div id="tw-post-card" className="tw-card">
                  <div className="tw-header">
                    <div className="tw-avatar-wrap">
                      <div className="tw-avatar"><span className="tw-avatar-initials">NTR</span></div>
                      <div>
                        <div className="tw-name">Not The Rug</div>
                        <div className="tw-handle">@not_the_rug</div>
                      </div>
                    </div>
                    <svg className="tw-x-logo" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.261 5.636 5.902-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div className="tw-body">{instagramCopy ?? 'No post copy for this run.'}</div>
                  <div className="tw-image">
                    {active?.generatedImage?.renderDownloadURL ? (
                      <img src={active.generatedImage.renderDownloadURL} alt="Not The Rug social post" />
                    ) : (
                      <div className="tw-image-ph">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c0c5cc" strokeWidth="1.4">
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="tw-actions">
                    <button className="tw-act-btn" aria-label="Reply">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button className="tw-act-btn" aria-label="Repost">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    </button>
                    <button className="tw-act-btn" aria-label="Like">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <button className="tw-act-btn" aria-label="Views">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button className="tw-act-btn" aria-label="Bookmark">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem className="platform-slot">
                <div className="platform-label">Facebook</div>
                <div id="fb-post-card" className="fb-card">
                  <div className="fb-header">
                    <div className="fb-avatar"><span className="fb-avatar-initials">NTR</span></div>
                    <div>
                      <div className="fb-name">Not The Rug</div>
                      <div className="fb-meta">Just now · 🌐</div>
                    </div>
                  </div>
                  <div className="fb-body">{instagramCopy ?? 'No post copy for this run.'}</div>
                  <div className="fb-image">
                    {active?.generatedImage?.renderDownloadURL ? (
                      <img src={active.generatedImage.renderDownloadURL} alt="Not The Rug social post" />
                    ) : (
                      <div className="fb-image-ph">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c0c5cc" strokeWidth="1.4">
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="fb-reactions">
                    <div>👍 ❤️ 😮</div>
                    <div>4 comments</div>
                  </div>
                  <div className="fb-btn-row">
                    <button className="fb-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                      Like
                    </button>
                    <button className="fb-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      Comment
                    </button>
                    <button className="fb-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share
                    </button>
                  </div>
                </div>
              </CarouselItem>

            </CarouselContent>

            <div className="carousel-footer">
              <CarouselPrevious className="carousel-arrow" />
              <div className="carousel-dots">
                {['Instagram', 'X / Twitter', 'Facebook'].map((label, i) => (
                  <button
                    key={label}
                    className={`carousel-dot${carouselIndex === i ? ' active' : ''}`}
                    aria-label={`Go to ${label}`}
                    onClick={() => onSelectSlide(i)}
                  />
                ))}
              </div>
              <CarouselNext className="carousel-arrow" />
            </div>
          </Carousel>

          {active?.generatedImage?.renderDownloadURL && (
            <div className="ig-post-btns">
              <a className="db-btn db-btn-primary" href={active.generatedImage.renderDownloadURL} target="_blank" rel="noreferrer">Open Generator</a>
              <a className="db-btn" href={active.generatedImage.renderDownloadURL} download>Download</a>
            </div>
          )}

        </div>
      </section>

      <section className="db-panel">
        <div className="db-panel-head">
          <h2 className="db-panel-title">Content Angle</h2>
          <span className="db-note">Strategic framing</span>
        </div>
        <div className="db-panel-body">
          <div className="db-info-card">
            <div className="db-label">Content Angle</div>
            <div className="db-value">{contentAngle ?? 'No content angle captured for this run.'}</div>
          </div>
        </div>
      </section>

      <section className="db-panel">
        <div className="db-panel-head">
          <h2 className="db-panel-title">Social Media</h2>
          <span className="db-note">Platform-specific signals</span>
        </div>
        <div className="db-panel-body">
          <div className="db-intel-grid">
            <div className="db-info-card">
              <div className="db-label">Reddit Signals</div>
              {active?.redditSignals?.length ? (
                <div className="db-intel-list">
                  {active.redditSignals.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                      </div>
                      <div className="db-intel-body">{item.subreddit ? `${item.subreddit} · ${item.summary}` : item.summary}</div>
                      {item.takeaway ? <div className="db-intel-takeaway">{item.takeaway}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No Reddit signals surfaced for this run.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Yelp</div>
              {yelpSignals.length ? (
                <div className="db-intel-list">
                  {yelpSignals.map((item, index) => (
                    <div key={`${item.source}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.source || 'Yelp'}</a> : item.source || 'Yelp'}
                      </div>
                      <div className="db-intel-body">{item.insight}</div>
                      {item.takeaway ? <div className="db-intel-takeaway">{item.takeaway}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No Yelp insight surfaced for this run.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Google Business Page</div>
              {googleBusinessSignals.length ? (
                <div className="db-intel-list">
                  {googleBusinessSignals.map((item, index) => (
                    <div key={`${item.source}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.source || 'Google Business Page'}</a> : item.source || 'Google Business Page'}
                      </div>
                      <div className="db-intel-body">{item.insight}</div>
                      {item.takeaway ? <div className="db-intel-takeaway">{item.takeaway}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No Google Business Page insight surfaced for this run.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Instagram</div>
              {instagramSignals.length ? (
                <div className="db-intel-list">
                  {instagramSignals.map((item, index) => (
                    <div key={`${item.source}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.author || item.source || 'Instagram'}</a> : item.author || item.source || 'Instagram'}
                      </div>
                      <div className="db-intel-body">{item.content}</div>
                      {item.source ? <div className="db-intel-takeaway">{item.source}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No Instagram signal surfaced for this run.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="db-panel">
        <div className="db-panel-head">
          <h2 className="db-panel-title">Local Intelligence</h2>
        </div>
        <div className="db-panel-body">
          <div className="db-intel-grid">
            <div className="db-info-card">
              <div className="db-label">Competitors</div>
              {active?.competitorIntel?.length ? (
                <div className="db-intel-list">
                  {active.competitorIntel.map((item, index) => (
                    <div key={`${item.competitor}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.competitor}</a> : item.competitor}
                      </div>
                      <div className="db-intel-body">{item.finding}</div>
                      {item.impact ? <div className="db-intel-takeaway">Impact: {item.impact}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No competitor activity detected this cycle.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Partnership / Referral Opportunities</div>
              {active?.relationshipSignals?.length ? (
                <div className="db-intel-list">
                  {active.relationshipSignals.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.name}</a> : item.name}
                      </div>
                      <div className="db-intel-body">{item.summary}</div>
                      {(item.priority || item.type) ? <div className="db-intel-takeaway">{[item.priority, item.type].filter(Boolean).join(' · ')}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No referral opportunities surfaced for this run.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Local Events</div>
              {active?.localEvents?.length ? (
                <div className="db-intel-list">
                  {active.localEvents.map((item, index) => (
                    <div key={`${item.event}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.event}</a> : item.event}
                      </div>
                      {item.date ? <div className="db-note">{item.date}</div> : null}
                      <div className="db-intel-body">{item.impact}</div>
                      {item.opportunity ? <div className="db-intel-takeaway">{item.opportunity}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No local events or holiday hooks surfaced this cycle.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Local Demand Signals</div>
              {active?.primarySignals?.length ? (
                <div className="db-intel-list">
                  {active.primarySignals.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">{item.title}</div>
                      <div className="db-intel-body">{item.detail}</div>
                      {item.relevance ? <div className="db-intel-takeaway">Priority: {item.relevance}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No local demand signals captured for this run.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Brand Mentions</div>
              {active?.brandMentions?.length ? (
                <div className="db-intel-list">
                  {active.brandMentions.map((item, index) => (
                    <div key={`${item.source}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.author || item.source}</a> : item.author || item.source}
                      </div>
                      <div className="db-intel-body">{item.content}</div>
                      {item.source ? <div className="db-intel-takeaway">{item.source}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No brand mentions surfaced this cycle.</div>
              )}
            </div>

            <div className="db-info-card">
              <div className="db-label">Content Opportunities</div>
              {active?.contentOpportunities?.length ? (
                <div className="db-intel-list">
                  {active.contentOpportunities.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="db-intel-item">
                      <div className="db-intel-name">
                        {item.source ? <span className="db-platform-badge" data-platform={item.source}>{item.source}</span> : null}
                        {item.url ? <a className="db-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                      </div>
                      <div className="db-intel-body">{item.summary}</div>
                      {(item.priority || item.format) ? <div className="db-intel-takeaway">{[item.priority, item.format].filter(Boolean).join(' · ')}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="db-empty">No content opportunities identified for this run.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="db-panel">
        <div className="db-panel-head">
          <h2 className="db-panel-title">Run Snapshot</h2>
          <span className="db-note">Active run metrics</span>
        </div>
        <div className="db-panel-body">
          <div className="db-card-grid">
            <div className="db-info-card">
              <div className="db-label">Last Run</div>
              <div className="db-value">{formatDate(active?.createdAt)}</div>
            </div>
            <div className="db-info-card">
              <div className="db-label">Quality Score</div>
              <div className="db-value">{active?.qualityScore != null ? `${active.qualityScore}/100` : 'n/a'}</div>
            </div>
            <div className="db-info-card">
              <div className="db-label">Publish Status</div>
              <div className="db-value">{active?.readyToPublish ? 'Ready to publish' : 'Review recommended'}</div>
            </div>
            <div className="db-info-card">
              <div className="db-label">Current Status</div>
              <div className="db-value">{active?.status ?? 'No status'}</div>
            </div>
          </div>
          <div className="db-info-card">
            <div className="db-label">Estimated Run Cost</div>
            <div className="db-value">
              Total {formatUsd(active?.runCost?.totalEstimatedUsd)} · AI {formatUsd(active?.runCost?.aiEstimatedUsd)} · Firebase {formatUsd(active?.runCost?.firebaseEstimatedUsd)}
            </div>
            {stageCosts.length ? (
              <div className="db-intel-list">
                {stageCosts.slice(0, 4).map((stage) => (
                  <div key={stage.stage} className="db-intel-item">
                    <div className="db-intel-name">{stage.stage}</div>
                    <div className="db-intel-body">{stage.model} · {stage.inputTokens} in / {stage.outputTokens} out · {formatUsd(stage.estimatedUsd)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty">Cost estimator has not been recorded for this run yet.</div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
