for f in mobile desktop; do for i in 1 2 3; do
 extra=""; [ $f = desktop ] && extra="--preset=desktop"
 for v in base:3032 merged:3031; do n=${v%%:*}; p=${v##*:}
  uptime | sed "s/.*averages: /$n $f $i load /" >> lh-load.log
  npx -y lighthouse@12 http://localhost:$p/ $extra --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=lh-$n-$f-$i.json --quiet >/dev/null 2>lh-$n-$f-$i.err
 done; done; done; echo done > lh.done
