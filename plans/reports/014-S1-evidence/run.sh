for f in mobile desktop; do for i in 1 2 3; do
 extra=""; [ $f = desktop ] && extra="--preset=desktop"
 npx -y lighthouse@12 https://nottherug-ten.vercel.app/ $extra --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=baseline-lighthouse-$f-$i.json --quiet >/dev/null 2>lh-$f-$i.err
done; done; echo done > run.done
