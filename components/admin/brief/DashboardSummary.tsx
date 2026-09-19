'use client';

import { useMemo } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { WeatherBackground, extractWeatherDisplay, getWeatherKey } from './WeatherBackdrop';
import { formatCompactDate, formatDate, formatUsd } from './overview';
import type { LatestBriefResponse, OverviewRun } from './types';

const PLATFORM_LABELS = ['Instagram', 'X / Twitter', 'Facebook'];

/**
 * Everything above the "Previous Runs" rail: the weather hero, priority
 * action, cross-platform post preview, content angle, and the two signal
 * grids. Kept as one component because it is one continuous read of a
 * single `active` run — see DashboardHistory for the separate "pick a
 * different run" concern.
 *
 * Restyled onto the site's marketing skin (app/globals.css): paper `.card`
 * panels, `.stamp-label` headings and `.rc-row` data rows in place of the
 * page's former standalone dark theme. The weather canvas
 * (WeatherBackdrop.tsx) is untouched — its sky/rain/snow rendering is drawn
 * in JS with its own palette and cannot be expressed through the marketing
 * class vocabulary, so it keeps its own look inside the card.
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

  const generatedImageUrl = active?.generatedImage?.renderDownloadURL ?? null;

  return (
    <>
      <section className="card" id="brief-hero-panel">
        {/* WeatherBackdrop.tsx is untouched: its canvas paints its own sky
            palette imperatively and cannot be expressed through the marketing
            class vocabulary. It sits as a plain decorative strip here (no
            text overlaid on top of it, so no scrim/gradient is needed) —
            see the report for why it keeps its own look. */}
        <div id="brief-hero-weather-stage">
          <WeatherBackground weatherKey={weatherKey} />
        </div>

        <div className="card-pad" id="brief-hero-copy">
          <div className="stamp-label stamp-label-heading">Daily Brief</div>
          <h1>Not the Rug</h1>
          <span className="form-note">{formatDate(active?.createdAt)}</span>
          {error ? <div className="form-note text-terra">{error}</div> : null}
        </div>

        <div className="card-pad grid-3" id="brief-hero-stats-grid">
          <div id="brief-weather-stat">
            <div className="label">Weather Impact</div>
            <div className="hero-stat-num">{weatherDisplay.headline}</div>
            <div className="form-note">{weatherDisplay.lineOne}</div>
            {weatherDisplay.lineTwo ? <div className="form-note">{weatherDisplay.lineTwo}</div> : null}
          </div>
          <div id="brief-run-cost-stat">
            <div className="label">Run Cost</div>
            <div className="hero-stat-num">{formatUsd(active?.runCost?.totalEstimatedUsd)}</div>
            <div className="form-note">AI {formatUsd(active?.runCost?.aiEstimatedUsd)} · Storage {formatUsd(active?.runCost?.firebaseEstimatedUsd)}</div>
          </div>
          <div id="brief-leads-captured-stat">
            <div className="label">Leads Captured</div>
            <div className="hero-stat-num">{latest?.leadStats?.today?.count ?? 0}</div>
            <div className="form-note">
              Today ({latest?.leadStats?.today?.dateLabel ?? '—'}) · Yesterday {latest?.leadStats?.yesterday?.count ?? 0}
            </div>
            <div className="form-note">
              7d {latest?.leadStats?.totals?.last7Days ?? 0} · 30d {latest?.leadStats?.totals?.last30Days ?? 0} · Recent {latest?.leadStats?.totals?.recentCount ?? 0}
            </div>
          </div>
        </div>
      </section>

      <section className="card card-pad" id="brief-priority-action-panel">
        <div className="stamp-label stamp-label-heading">Priority Action</div>
        <div className="rc-row">
          <div>
            <div className="rc-label">Immediate move for this run</div>
            <div className="rc-value">{active?.scoutPriorityAction ?? 'No priority action saved for this run.'}</div>
          </div>
        </div>
      </section>

      <section className="card card-pad" id="brief-post-of-day-panel">
        <div className="stamp-label stamp-label-heading">Post of the Day</div>
        <span className="form-note">{isHistorical ? 'Historical package' : 'Latest package'}</span>

        <Carousel
          id="platform-post-carousel-shell"
          className="carousel-shell"
          opts={{ align: 'center', containScroll: false, breakpoints: { '(min-width: 1280px)': { active: false } } }}
          setApi={setCarouselApi}
        >
          <CarouselContent className="platform-track">

            <CarouselItem className="platform-slot">
              <div className="card card-pad" id="brief-post-instagram-card">
                <span className="badge badge-sage">Instagram</span>
                <div className="polaroid" id="brief-post-instagram-polaroid">
                  <div className="polaroid-window">
                    {generatedImageUrl ? (
                      <img src={generatedImageUrl} alt="Not The Rug social post" />
                    ) : (
                      <div className="form-note" id="brief-post-instagram-empty">
                        Generated post image appears here
                        <br />
                        <a className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" href="/admin/dashboard/photos">Open Photos →</a>
                      </div>
                    )}
                  </div>
                  <div className="polaroid-caption">{instagramCopy ?? 'No caption saved for this run.'}</div>
                </div>
                <span className="form-note">{active?.createdAt ? formatCompactDate(active.createdAt) : 'Just now'}</span>
              </div>
            </CarouselItem>

            <CarouselItem className="platform-slot">
              <div className="card card-pad" id="brief-post-twitter-card">
                <span className="badge badge-gold">X / Twitter</span>
                <div className="polaroid" id="brief-post-twitter-polaroid">
                  <div className="polaroid-window">
                    {generatedImageUrl ? (
                      <img src={generatedImageUrl} alt="Not The Rug social post" />
                    ) : (
                      <div className="form-note">No generated image for this run.</div>
                    )}
                  </div>
                  <div className="polaroid-caption">{instagramCopy ?? 'No post copy for this run.'}</div>
                </div>
              </div>
            </CarouselItem>

            <CarouselItem className="platform-slot">
              <div className="card card-pad" id="brief-post-facebook-card">
                <span className="badge badge-terra">Facebook</span>
                <div className="polaroid" id="brief-post-facebook-polaroid">
                  <div className="polaroid-window">
                    {generatedImageUrl ? (
                      <img src={generatedImageUrl} alt="Not The Rug social post" />
                    ) : (
                      <div className="form-note">No generated image for this run.</div>
                    )}
                  </div>
                  <div className="polaroid-caption">{instagramCopy ?? 'No post copy for this run.'}</div>
                </div>
              </div>
            </CarouselItem>

          </CarouselContent>

          <div className="carousel-footer" id="brief-post-carousel-footer">
            <CarouselPrevious className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" />
            <div id="brief-post-carousel-slide-jumps">
              {PLATFORM_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary"
                  aria-current={carouselIndex === i ? 'true' : undefined}
                  onClick={() => onSelectSlide(i)}
                >
                  {label}
                </button>
              ))}
            </div>
            <CarouselNext className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" />
          </div>
        </Carousel>

        {generatedImageUrl && (
          <div id="brief-post-of-day-actions">
            <a className="btn btn-primary booking-forward-btn btn-accent" href={generatedImageUrl} target="_blank" rel="noreferrer">Open Generator</a>
            <a className="btn btn-primary booking-forward-btn btn-sm admin-btn-secondary" href={generatedImageUrl} download>Download</a>
          </div>
        )}
      </section>

      <section className="card card-pad" id="brief-content-angle-panel">
        <div className="stamp-label stamp-label-heading">Content Angle</div>
        <span className="form-note">Strategic framing</span>
        <div className="rc-row">
          <div className="rc-value">{contentAngle ?? 'No content angle captured for this run.'}</div>
        </div>
      </section>

      <section className="card card-pad" id="brief-social-signals-panel">
        <div className="stamp-label stamp-label-heading">Social Media</div>
        <span className="form-note">Platform-specific signals</span>

        <div className="grid-2" id="brief-social-signals-grid">
          <div id="brief-signal-reddit">
            <div className="label">Reddit Signals</div>
            {active?.redditSignals?.length ? (
              <div id="brief-signal-reddit-list">
                {active.redditSignals.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                      </div>
                      <div className="rc-label">{item.subreddit ? `${item.subreddit} · ${item.summary}` : item.summary}</div>
                      {item.takeaway ? <div className="form-note">{item.takeaway}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No Reddit signals surfaced for this run.</div>
            )}
          </div>

          <div id="brief-signal-yelp">
            <div className="label">Yelp</div>
            {yelpSignals.length ? (
              <div id="brief-signal-yelp-list">
                {yelpSignals.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.source || 'Yelp'}</a> : item.source || 'Yelp'}
                      </div>
                      <div className="rc-label">{item.insight}</div>
                      {item.takeaway ? <div className="form-note">{item.takeaway}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No Yelp insight surfaced for this run.</div>
            )}
          </div>

          <div id="brief-signal-google-business">
            <div className="label">Google Business Page</div>
            {googleBusinessSignals.length ? (
              <div id="brief-signal-google-business-list">
                {googleBusinessSignals.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.source || 'Google Business Page'}</a> : item.source || 'Google Business Page'}
                      </div>
                      <div className="rc-label">{item.insight}</div>
                      {item.takeaway ? <div className="form-note">{item.takeaway}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No Google Business Page insight surfaced for this run.</div>
            )}
          </div>

          <div id="brief-signal-instagram">
            <div className="label">Instagram</div>
            {instagramSignals.length ? (
              <div id="brief-signal-instagram-list">
                {instagramSignals.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.author || item.source || 'Instagram'}</a> : item.author || item.source || 'Instagram'}
                      </div>
                      <div className="rc-label">{item.content}</div>
                      {item.source ? <div className="form-note">{item.source}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No Instagram signal surfaced for this run.</div>
            )}
          </div>
        </div>
      </section>

      <section className="card card-pad" id="brief-local-intel-panel">
        <div className="stamp-label stamp-label-heading">Local Intelligence</div>

        <div className="grid-2" id="brief-local-intel-grid">
          <div id="brief-intel-competitors">
            <div className="label">Competitors</div>
            {active?.competitorIntel?.length ? (
              <div id="brief-intel-competitors-list">
                {active.competitorIntel.map((item, index) => (
                  <div key={`${item.competitor}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.competitor}</a> : item.competitor}
                      </div>
                      <div className="rc-label">{item.finding}</div>
                      {item.impact ? <div className="form-note">Impact: {item.impact}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No competitor activity detected this cycle.</div>
            )}
          </div>

          <div id="brief-intel-partnerships">
            <div className="label">Partnership / Referral Opportunities</div>
            {active?.relationshipSignals?.length ? (
              <div id="brief-intel-partnerships-list">
                {active.relationshipSignals.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a> : item.name}
                      </div>
                      <div className="rc-label">{item.summary}</div>
                      {(item.priority || item.type) ? <div className="form-note">{[item.priority, item.type].filter(Boolean).join(' · ')}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No referral opportunities surfaced for this run.</div>
            )}
          </div>

          <div id="brief-intel-local-events">
            <div className="label">Local Events</div>
            {active?.localEvents?.length ? (
              <div id="brief-intel-local-events-list">
                {active.localEvents.map((item, index) => (
                  <div key={`${item.event}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.event}</a> : item.event}
                      </div>
                      {item.date ? <div className="form-note">{item.date}</div> : null}
                      <div className="rc-label">{item.impact}</div>
                      {item.opportunity ? <div className="form-note">{item.opportunity}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No local events or holiday hooks surfaced this cycle.</div>
            )}
          </div>

          <div id="brief-intel-demand-signals">
            <div className="label">Local Demand Signals</div>
            {active?.primarySignals?.length ? (
              <div id="brief-intel-demand-signals-list">
                {active.primarySignals.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">{item.title}</div>
                      <div className="rc-label">{item.detail}</div>
                      {item.relevance ? <div className="form-note">Priority: {item.relevance}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No local demand signals captured for this run.</div>
            )}
          </div>

          <div id="brief-intel-brand-mentions">
            <div className="label">Brand Mentions</div>
            {active?.brandMentions?.length ? (
              <div id="brief-intel-brand-mentions-list">
                {active.brandMentions.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.author || item.source}</a> : item.author || item.source}
                      </div>
                      <div className="rc-label">{item.content}</div>
                      {item.source ? <div className="form-note">{item.source}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No brand mentions surfaced this cycle.</div>
            )}
          </div>

          <div id="brief-intel-content-opportunities">
            <div className="label">Content Opportunities</div>
            {active?.contentOpportunities?.length ? (
              <div id="brief-intel-content-opportunities-list">
                {active.contentOpportunities.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rc-row">
                    <div>
                      <div className="rc-value">
                        {item.source ? <span className="badge">{item.source}</span> : null}{' '}
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                      </div>
                      <div className="rc-label">{item.summary}</div>
                      {(item.priority || item.format) ? <div className="form-note">{[item.priority, item.format].filter(Boolean).join(' · ')}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="form-note">No content opportunities identified for this run.</div>
            )}
          </div>
        </div>
      </section>

      <section className="card card-pad" id="brief-run-snapshot-panel">
        <div className="stamp-label stamp-label-heading">Run Snapshot</div>
        <span className="form-note">Active run metrics</span>

        <div className="values-grid" id="brief-run-snapshot-grid">
          <div className="value-cell">
            <div className="value-num">{formatCompactDate(active?.createdAt)}</div>
            <h4>Last Run</h4>
          </div>
          <div className="value-cell">
            <div className="value-num">{active?.qualityScore != null ? `${active.qualityScore}/100` : 'n/a'}</div>
            <h4>Quality Score</h4>
          </div>
          <div className="value-cell">
            <div className="value-num">{active?.readyToPublish ? 'Ready' : 'Review'}</div>
            <h4>Publish Status</h4>
          </div>
          <div className="value-cell">
            <div className="value-num">{active?.status ?? 'No status'}</div>
            <h4>Current Status</h4>
          </div>
        </div>

        <div id="brief-run-cost-breakdown">
          <div className="rc-row">
            <div>
              <div className="rc-label">Estimated Run Cost</div>
              <div className="rc-value">
                Total {formatUsd(active?.runCost?.totalEstimatedUsd)} · AI {formatUsd(active?.runCost?.aiEstimatedUsd)} · Firebase {formatUsd(active?.runCost?.firebaseEstimatedUsd)}
              </div>
            </div>
          </div>
          {stageCosts.length ? (
            <div id="brief-run-cost-stage-list">
              {stageCosts.slice(0, 4).map((stage) => (
                <div key={stage.stage} className="rc-row">
                  <div>
                    <div className="rc-value">{stage.stage}</div>
                    <div className="rc-label">{stage.model} · {stage.inputTokens} in / {stage.outputTokens} out · {formatUsd(stage.estimatedUsd)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="form-note">Cost estimator has not been recorded for this run yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
