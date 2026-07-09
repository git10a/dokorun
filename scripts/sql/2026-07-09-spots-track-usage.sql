-- トラック開放施設(競技場)の個人利用情報。料金・開放日・スパイク規定などをjsonbで持つ
alter table spots add column if not exists track_usage jsonb;
