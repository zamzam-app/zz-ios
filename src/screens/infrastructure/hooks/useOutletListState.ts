import React from 'react';
import { Alert } from 'react-native';

import { Outlet } from '../../../api/endpoints/outlets';
import { useDeleteOutlet } from '../../../hooks/infrastructure';
import { buildOutletsScreenModel, OUTLET_SEARCH_DEBOUNCE_MS } from '../outletSearch';

export function useOutletListState(outlets: Outlet[] | undefined) {
  const deleteOutlet = useDeleteOutlet();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const outletList = React.useMemo(() => outlets ?? [], [outlets]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, OUTLET_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const screenModel = React.useMemo(
    () => buildOutletsScreenModel(outletList, searchQuery, debouncedSearchQuery),
    [debouncedSearchQuery, outletList, searchQuery],
  );

  const handleDelete = (outlet: Outlet) => {
    Alert.alert('Delete Outlet', `Delete "${outlet.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteOutlet.mutate(outlet.id),
      },
    ]);
  };

  return {
    searchQuery,
    setSearchQuery,
    screenModel,
    handleDelete,
    outletList,
  };
}
